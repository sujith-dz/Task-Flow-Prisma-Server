import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { RequestWithUser } from '../types';
import { AppError } from '../utils/errorHandler';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireAdmin = requireRole(Role.ADMIN);

