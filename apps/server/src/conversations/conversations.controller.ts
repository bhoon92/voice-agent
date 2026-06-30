import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { InternalGuard } from './internal.guard';
import { ConversationsService } from './conversations.service';
import { AppendMessageDto } from './dto/append-message.dto';

@Controller()
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async list(@CurrentUser() user: AuthUser) {
    const convs = await this.conversations.listByUser(user.id);
    return convs.map((c) => ({
      id: c.id,
      room: c.room,
      model: c.model,
      startedAt: c.startedAt,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const conv = await this.conversations.getForUser(user.id, id);
    if (!conv) throw new NotFoundException();
    return {
      id: conv.id,
      room: conv.room,
      model: conv.model,
      startedAt: conv.startedAt,
      messages: conv.messages, // JSONB 배열 그대로
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/observe/:room')
  async observe(@Param('room') room: string) {
    const data = await this.conversations.getLiveMessages(room.toUpperCase());
    if (!data) throw new NotFoundException();
    return data;
  }

  @UseGuards(InternalGuard)
  @Post('internal/conversations/:id/messages')
  async append(@Param('id') id: string, @Body() dto: AppendMessageDto) {
    await this.conversations.appendMessage(id, dto.role, dto.content);
    return { ok: true };
  }

  @UseGuards(InternalGuard)
  @Post('internal/conversations/:id/flush')
  async flush(@Param('id') id: string) {
    const count = await this.conversations.flush(id);
    return { ok: true, flushed: count };
  }
}
