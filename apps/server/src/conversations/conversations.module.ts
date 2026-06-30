import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsScanner } from './conversations.scanner';
import { InternalGuard } from './internal.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation])],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsScanner, InternalGuard],
  exports: [ConversationsService],
})
export class ConversationsModule {}
