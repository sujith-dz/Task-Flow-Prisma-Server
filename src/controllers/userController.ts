import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, UpdateUserInput } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { PasswordService } from '../services/passwordService';

export const getProfile = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Support both 'data' and 'user' response formats for compatibility
  res.json({
    success: true,
    data: user,
    user: user, // Also include 'user' for frontend compatibility
  });
});

export const updateProfile = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { name, email, password }: UpdateUserInput = req.body;

  const updateData: any = {};

  if (name) updateData.name = name;
  if (email) {
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser && existingUser.id !== req.user.userId) {
      throw new AppError('Email is already taken', 400);
    }
    updateData.email = email;
  }
  if (password) {
    updateData.password = await PasswordService.hashPassword(password);
  }

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

