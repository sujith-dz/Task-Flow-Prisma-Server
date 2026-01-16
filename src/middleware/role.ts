import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { AppError } from '../utils/errorHandler';
import { userHasAnyPermission, userHasRole } from '../utils/roleHelpers';

// Require specific permission
export const requirePermission = (permissionName: string) => {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const hasPermission = await userHasAnyPermission(req.user.userId, [permissionName]);
    
    if (!hasPermission) {
      return next(new AppError("You don't have permissions", 403));
    }

    next();
  };
};

// Require any of the specified permissions
export const requireAnyPermission = (...permissionNames: string[]) => {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const hasPermission = await userHasAnyPermission(req.user.userId, permissionNames);
    
    if (!hasPermission) {
      return next(new AppError("You don't have permissions", 403));
    }

    next();
  };
};

// Require specific role
export const requireRole = (roleName: string) => {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const hasRole = await userHasRole(req.user.userId, roleName);
    
    if (!hasRole) {
      return next(new AppError("You don't have permissions", 403));
    }

    next();
  };
};

// Convenience functions
export const requireAdmin = requireRole('ADMIN');

