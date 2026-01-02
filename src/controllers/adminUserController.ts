import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, UpdateUserInput, BulkUserInput } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Role } from '@prisma/client';
import { PasswordService } from '../services/passwordService';

export const getAllUsers = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      imageUrl: true,
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
      imageUrl: true,
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

  if (name !== undefined && name !== null && name.trim() !== '') {
    updateData.name = name.trim();
  }
  if (email !== undefined && email !== null && email.trim() !== '') {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    });
    if (existingUser && existingUser.id !== id) {
      throw new AppError('Email is already taken', 400);
    }
    updateData.email = email.trim();
  }
  if (password !== undefined && password !== null && password.trim() !== '') {
    updateData.password = await PasswordService.hashPassword(password);
  }
  if (role && Object.values(Role).includes(role)) {
    updateData.role = role;
  }
  if (req.body.isActive !== undefined) {
    updateData.isActive = req.body.isActive;
  }

  // Check if at least one field is being updated
  if (Object.keys(updateData).length === 0) {
    throw new AppError('At least one field must be provided for update', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      imageUrl: true,
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

export const createBulkUsers = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const { users }: { users: BulkUserInput[] } = req.body;

  if (!Array.isArray(users) || users.length === 0) {
    throw new AppError('Users array is required and must not be empty', 400);
  }

  if (users.length > 100) {
    throw new AppError('Cannot create more than 100 users at once', 400);
  }

  const results: {
    success: Array<{ email: string; id: string; name: string }>;
    failed: Array<{ email: string; error: string }>;
  } = {
    success: [],
    failed: [],
  };

  // Track emails in the request to detect duplicates within the request
  const requestEmails = new Set<string>();
  const duplicateEmailsInRequest: string[] = [];

  // First pass: validate and check for duplicates in request
  for (const user of users) {
    if (!user.email || !user.password || !user.name) {
      results.failed.push({
        email: user.email || 'unknown',
        error: 'Email, password, and name are required',
      });
      continue;
    }

    if (requestEmails.has(user.email.toLowerCase())) {
      duplicateEmailsInRequest.push(user.email);
      results.failed.push({
        email: user.email,
        error: 'Duplicate email in request',
      });
      continue;
    }

    requestEmails.add(user.email.toLowerCase());
  }

  // Get all existing emails from database in one query
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: Array.from(requestEmails),
      },
    },
    select: {
      email: true,
    },
  });

  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  // Process each user
  for (const userInput of users) {
    // Skip if already marked as failed
    if (results.failed.some((f) => f.email === userInput.email)) {
      continue;
    }

    try {
      // Check if email already exists in database
      if (existingEmails.has(userInput.email.toLowerCase())) {
        results.failed.push({
          email: userInput.email,
          error: 'User with this email already exists',
        });
        continue;
      }

      // Validate role if provided
      if (userInput.role && !Object.values(Role).includes(userInput.role)) {
        results.failed.push({
          email: userInput.email,
          error: `Invalid role: ${userInput.role}. Must be USER or ADMIN`,
        });
        continue;
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(userInput.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userInput.email,
          password: hashedPassword,
          name: userInput.name,
          role: userInput.role || Role.USER,
          isActive: userInput.isActive !== undefined ? userInput.isActive : true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      results.success.push({
        email: user.email,
        id: user.id,
        name: user.name,
      });

      // Add to existing emails set to prevent duplicates in the same request
      existingEmails.add(userInput.email.toLowerCase());
    } catch (error) {
      results.failed.push({
        email: userInput.email,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

    const response: any = {
      success: results.success.length > 0,
      message: `Created ${results.success.length} user(s), ${results.failed.length} failed`,
      data: {
        created: results.success.length,
        failed: results.failed.length,
        total: users.length,
        successfulUsers: results.success,
        failedUsers: results.failed,
      },
    };

    // If all failed, return 400, otherwise return 201 with partial success
    if (results.success.length === 0) {
      return res.status(400).json(response);
    }

  res.status(201).json(response);
});

