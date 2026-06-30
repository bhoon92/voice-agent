import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';

@Module({
  imports: [AuthModule, ConversationsModule],
  controllers: [LivekitController],
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
