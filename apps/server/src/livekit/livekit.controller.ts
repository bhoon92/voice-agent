import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ConversationsService } from '../conversations/conversations.service';
import { LivekitService } from './livekit.service';
import { CreateTokenDto } from './dto/create-token.dto';

const DEFAULT_MODEL = 'groq-qwen';

@Controller('livekit')
export class LivekitController {
  constructor(
    private readonly livekit: LivekitService,
    private readonly conversations: ConversationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async createToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTokenDto,
  ) {
    const model = dto.model ?? DEFAULT_MODEL;
    const conversation = await this.conversations.start(user.id, model);

    const token = await this.livekit.createJoinToken({
      identity: user.id,
      name: user.name,
      room: conversation.room,
      model,
      conversationId: conversation.id,
    });

    return {
      token,
      url: this.livekit.serverUrl,
      identity: user.id,
      room: conversation.room,
      conversationId: conversation.id,
    };
  }
}
