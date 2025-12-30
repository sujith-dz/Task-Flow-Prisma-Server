import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, CreateTaskInput, UpdateTaskInput } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Role, TaskStatus } from '@prisma/client';

export const getAllTasks = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  let tasks;

  if (req.user.role === Role.ADMIN) {
    // Admins can see all tasks
    tasks = await prisma.task.findMany({
      include: {
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } else {
    // Regular users can only see tasks they created or are assigned to
    tasks = await prisma.task.findMany({
      where: {
        OR: [
          { assignerId: req.user.userId },
          { assigneeId: req.user.userId },
        ],
      },
      include: {
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  res.json({
    success: true,
    data: tasks,
  });
});

export const getTaskById = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assigner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to view this task
  if (req.user.role !== Role.ADMIN && task.assignerId !== req.user.userId && task.assigneeId !== req.user.userId) {
    throw new AppError('You do not have permission to view this task', 403);
  }

  res.json({
    success: true,
    data: task,
  });
});

export const createTask = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {


    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }
    console.log(req.body, '---------------req.body')

    const { title, description, assigneeId, status }: CreateTaskInput = req.body;

    const assignerId = req.user.userId;

    if (!title) {
      throw new AppError('Title is required', 400);
    }
    console.log(status, '---------status')
    // If assigneeId is provided, verify the user exists
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      });
      if (!assignee) {
        throw new AppError('Assignee not found', 404);
      }
    }
    const role = req.user.role;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignerId: req.user.userId,
        // assigneeId: role === Role.USER ? assigneeId : role,
        assigneeId: req.user.userId,
        status: TaskStatus.TODO,
      },
      include: {
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error: any) {
    console.log(error.message, '------------task creating error')
  }
});

export const updateTask = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { title, description, assigneeId, status }: UpdateTaskInput = req.body;

  const task = await prisma.task.findUnique({
    where: { id },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to update this task (only assigner or admin)
  if (req.user.role !== Role.ADMIN && task.assignerId !== req.user.userId) {
    throw new AppError('You do not have permission to update this task', 403);
  }

  // If assigneeId is provided, verify the user exists
  if (assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (!assignee) {
      throw new AppError('Assignee not found', 404);
    }
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
  if (status && Object.values(TaskStatus).includes(status)) {
    updateData.status = status;
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assigner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: updatedTask,
  });
});

export const deleteTask = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to delete this task (only assigner or admin)
  if (req.user.role !== Role.ADMIN && task.assignerId !== req.user.userId) {
    throw new AppError('You do not have permission to delete this task', 403);
  }

  await prisma.task.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
});

