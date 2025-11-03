// src/auth/strategies/jwt.strategy.ts

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '../../roles/entities/role.entity'; // <-- 1. IMPORT RoleName

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // --- VALIDATE METHOD UPDATED HERE ---
  async validate(payload: { sub: number; email: string; role: RoleName }) {
    // 2. UPDATE PAYLOAD SIGNATURE
    return { id: payload.sub, email: payload.email, role: payload.role }; // 3. RETURN ROLE
  }
}