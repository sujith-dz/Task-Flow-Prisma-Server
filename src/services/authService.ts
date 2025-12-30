import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { JWTPayload } from '../types';

export class AuthService {
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(
      payload,
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
    );
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, jwtConfig.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

