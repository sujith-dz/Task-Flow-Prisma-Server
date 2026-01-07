import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { RequestWithUser } from '../types';
import { AppError } from '../utils/errorHandler';

export const authenticate = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);
    // console.log(decoded,'...................decoded')

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Invalid or expired token', 401));
  }
};

