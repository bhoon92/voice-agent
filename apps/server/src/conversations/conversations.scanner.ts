import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConversationsService } from './conversations.service';

@Injectable()
export class ConversationsScanner {
  private readonly STALE_MS = 10 * 60 * 1000;

  constructor(private readonly conversations: ConversationsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scan(): Promise<void> {
    await this.conversations.flushStale(this.STALE_MS);
  }
}
