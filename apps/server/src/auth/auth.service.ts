import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

export interface JwtPayload {
  sub: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(name: string): Promise<{ token: string; user: User }> {
    const trimmed = name.trim();
    let user = await this.users.findOne({ where: { name: trimmed } });
    if (!user) {
      user = await this.users.save(this.users.create({ name: trimmed }));
    }

    const payload: JwtPayload = { sub: user.id, name: user.name };
    const token = await this.jwt.signAsync(payload);
    return { token, user };
  }
}
