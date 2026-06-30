import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export type ChatRole = 'user' | 'assistant';

/** 대화 한 턴. 대화 전체는 conversations.messages(JSONB)에 배열로 저장된다. */
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.conversations, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  userId!: string;

  /** 이 대화가 진행된 LiveKit 룸 코드. */
  @Column()
  room!: string;

  /** 사용자가 선택한 LLM 모델 id. */
  @Column()
  model!: string;

  /**
   * 학생 ↔ 에이전트 대화 전체를 하나의 JSONB 컬럼에 배열로 저장한다.
   * (대화는 통째로 쓰고 통째로 읽는 단위라 별도 메시지 테이블 없이 단순화)
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  messages!: ChatTurn[];

  @CreateDateColumn()
  startedAt!: Date;
}
