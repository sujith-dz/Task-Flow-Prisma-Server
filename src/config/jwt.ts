import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig: { secret: string; expiresIn: string } = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};

