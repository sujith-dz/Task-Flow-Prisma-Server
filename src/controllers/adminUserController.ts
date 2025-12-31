import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, UpdateUserInput } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Role } from '@prisma/client';
import { PasswordService } from '../services/passwordService';

export const getAllUsers = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: users,
  });
});

export const getUserById = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user,
  });
});

export const updateUser = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, email, password, role }: UpdateUserInput & { role?: Role } = req.body;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const updateData: any = {};

  if (name) updateData.name = name;
  if (email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser && existingUser.id !== id) {
      throw new AppError('Email is already taken', 400);
    }
    updateData.email = email;
  }
  if (password) {
    updateData.password = await PasswordService.hashPassword(password);
  }
  if (role && Object.values(Role).includes(role)) {
    updateData.role = role;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  });
});

export const deleteUser = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (req.user && req.user.userId === id) {
    throw new AppError('You cannot delete your own account', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await prisma.user.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

export const activateUser = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (req.user && req.user.userId === id) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    message: 'User activated successfully',
    data: updatedUser,
  });
});

export const deactivateUser = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (req.user && req.user.userId === id) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: updatedUser,
  });
});

