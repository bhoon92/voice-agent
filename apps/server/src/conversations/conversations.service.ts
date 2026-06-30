import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import {
  ChatRole,
  ChatTurn,
  Conversation,
} from '../database/entities/conversation.entity';

/** 버퍼가 쌓인 대화 집합. score는 마지막 활동 시각(ms)으로, 스캐너가 비활성 대화를 찾는 데 쓴다. */
const ACTIVE_KEY = 'conv:active';
const msgsKey = (id: string) => `conv:${id}:msgs`;

// 버퍼 키의 안전망 TTL: flush와 스캐너가 모두 실패해도 버퍼가 영원히 쌓이지 않게 한다.
// 스캐너 주기(1분)·비활성 임계(10분)보다 훨씬 길어, 정상 흐름에선 항상 flush가 먼저 일어난다.
const MSGS_TTL_SECONDS = 60 * 60 * 24; // 24h

// 6자리 룸 코드: 숫자 + 대문자, 혼동되는 문자(0/O, 1/I)는 제외.
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += ROOM_CHARS[randomInt(ROOM_CHARS.length)];
  return code;
}

@Injectable()
export class ConversationsService implements OnModuleInit {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * 부팅 복구: 이전 실행이 대화 중에 죽었다면 버퍼가 Redis에 남아 있다.
   * 다음 정기 스캔까지 방치되지 않도록, 부팅 시 남은 버퍼를 한 번 즉시 flush한다.
   */
  async onModuleInit(): Promise<void> {
    try {
      const recovered = await this.flushStale(0);
      if (recovered > 0) {
        this.logger.log(`boot recovery: flushed ${recovered} buffered conversation(s)`);
      }
    } catch (err) {
      this.logger.error('boot recovery flush failed', err);
    }
  }

  /**
   * 6자리 룸 코드를 만들어 대화 row를 생성한다. 코드는 중복이 아닐 때까지 재생성하므로
   * 룸 이름이자, 저장된 기록을 사람이 알아볼 수 있는 식별자 역할을 함께 한다.
   */
  async start(userId: string, model: string): Promise<Conversation> {
    let room = generateRoomCode();
    while ((await this.conversations.countBy({ room })) > 0) {
      room = generateRoomCode();
    }
    return this.conversations.save(
      this.conversations.create({ userId, room, model, messages: [] }),
    );
  }

  /**
   * 발화 한 건을 Redis에 버퍼링한다(빠르고, agent가 죽어도 보존됨). append할 때마다
   * 안전망 TTL을 갱신해, 정리가 한 번도 돌지 않아도 버퍼가 영원히 남지 않게 한다.
   * 실제 Postgres 기록은 flush 시점에 JSONB 컬럼으로 한 번에 저장된다.
   */
  async appendMessage(
    conversationId: string,
    role: ChatRole,
    content: string,
  ): Promise<void> {
    const key = msgsKey(conversationId);
    await this.redis.rpush(key, JSON.stringify({ role, content }));
    await this.redis.expire(key, MSGS_TTL_SECONDS);
    await this.redis.zadd(ACTIVE_KEY, Date.now(), conversationId);
  }

  /**
   * 버퍼에 쌓인 대화를 conversations.messages(JSONB)에 통째로 저장한다.
   *
   * 순서가 중요하다: Postgres에 먼저 저장하고, 성공한 뒤에만 Redis를 비운다.
   * DB 저장이 실패하면 대화를 active 집합과 버퍼에 그대로 남겨, 데이터를 잃거나
   * 좀비로 방치하는 대신 다음 스캔이 재시도하게 한다.
   * (버퍼가 비어 있으면 정리만 하면 되고, 두 번 호출돼도 안전하다.)
   */
  async flush(conversationId: string): Promise<number> {
    const key = msgsKey(conversationId);
    const items = await this.redis.lrange(key, 0, -1);

    if (items.length === 0) {
      await this.redis.zrem(ACTIVE_KEY, conversationId);
      await this.redis.del(key);
      return 0;
    }

    const turns: ChatTurn[] = items.map((raw) => JSON.parse(raw) as ChatTurn);

    // 대화 전체를 JSONB 컬럼에 한 번에 기록. 실패하면 아래 정리를 건너뛰어 재시도.
    await this.conversations.update(conversationId, { messages: turns });

    await this.redis.del(key);
    await this.redis.zrem(ACTIVE_KEY, conversationId);
    this.logger.log(`flushed ${turns.length} messages for ${conversationId}`);
    return turns.length;
  }

  /**
   * 안전망: `olderThanMs`보다 오래 비활성인 대화를 flush한다. 각 flush를 try/catch로
   * 격리해, 한 대화의 실패가 나머지를 막지 않게 한다(실패한 건 active에 남아 다음 스캔이 재시도).
   */
  async flushStale(olderThanMs: number): Promise<number> {
    const threshold = Date.now() - olderThanMs;
    const ids = await this.redis.zrangebyscore(ACTIVE_KEY, '-inf', threshold);
    let flushed = 0;
    for (const id of ids) {
      try {
        if ((await this.flush(id)) > 0) flushed++;
      } catch (err) {
        this.logger.error(`stale flush failed for ${id}, will retry next scan`, err);
      }
    }
    return flushed;
  }

  /** 사용자의 대화 목록(최신순). 목록엔 대화 본문이 필요 없어 메타만 가져온다. */
  listByUser(userId: string): Promise<Conversation[]> {
    return this.conversations.find({
      where: { userId },
      order: { startedAt: 'DESC' },
      select: { id: true, room: true, model: true, startedAt: true },
    });
  }

  /**
   * 대화 한 건(messages 포함) — 본인 소유일 때만 반환한다.
   * 아직 flush 전(종료 직후)이면 DB의 messages가 비어 있으므로, Redis 버퍼가
   * 남아 있으면 그쪽을 최신으로 사용한다. (flush 지연과 무관하게 즉시 보이도록)
   */
  async getForUser(
    userId: string,
    conversationId: string,
  ): Promise<Conversation | null> {
    const conv = await this.conversations.findOne({
      where: { id: conversationId, userId },
    });
    if (!conv) return null;

    const buffered = await this.redis.lrange(msgsKey(conv.id), 0, -1);
    if (buffered.length > 0) {
      conv.messages = buffered.map((raw) => JSON.parse(raw) as ChatTurn);
    }
    return conv;
  }

  /** room 코드로 가장 최근 대화를 찾는다(관찰용). */
  findByRoom(room: string): Promise<Conversation | null> {
    return this.conversations.findOne({
      where: { room },
      order: { startedAt: 'DESC' },
    });
  }

  /**
   * 관찰용: room의 현재 대화 내용을 반환한다. 진행 중이면 아직 flush 전이라
   * Redis 버퍼에서, 이미 끝나 flush됐으면 JSONB 컬럼에서 읽는다.
   */
  async getLiveMessages(
    room: string,
  ): Promise<{ conversationId: string; messages: ChatTurn[] } | null> {
    const conv = await this.findByRoom(room);
    if (!conv) return null;

    const buffered = await this.redis.lrange(msgsKey(conv.id), 0, -1);
    const messages: ChatTurn[] =
      buffered.length > 0
        ? buffered.map((raw) => JSON.parse(raw) as ChatTurn)
        : conv.messages;

    return { conversationId: conv.id, messages };
  }
}
