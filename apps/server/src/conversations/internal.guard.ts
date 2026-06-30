import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const provided = req.headers['x-internal-token'];
    const expected = this.config.getOrThrow<string>('INTERNAL_API_SECRET');
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('invalid internal token');
    }
    return true;
  }
}
