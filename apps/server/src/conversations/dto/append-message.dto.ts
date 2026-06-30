import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { ChatRole } from '../../database/entities/conversation.entity';

export class AppendMessageDto {
  @IsIn(['user', 'assistant'])
  role!: ChatRole;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
