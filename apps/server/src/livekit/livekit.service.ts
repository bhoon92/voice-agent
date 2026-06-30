import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
} from 'livekit-server-sdk';
export const VOICE_AGENT_NAME = 'voice-agent';
export interface JoinTokenParams {
  identity: string;
  name?: string;
  room: string;
  model?: string;
  conversationId: string;
}

@Injectable()
export class LivekitService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly url: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');
    this.url = this.config.getOrThrow<string>('LIVEKIT_URL');
  }

  get serverUrl(): string {
    return this.url;
  }

  async createJoinToken(params: JoinTokenParams): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: params.identity,
      name: params.name,
    });

    at.addGrant({
      roomJoin: true,
      room: params.room,
      canPublish: true,
      canSubscribe: true,
    });

    at.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: VOICE_AGENT_NAME,
          metadata: JSON.stringify({
            model: params.model,
            conversationId: params.conversationId,
          }),
        }),
      ],
    });

    return at.toJwt();
  }
}
