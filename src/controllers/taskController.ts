import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, CreateTaskInput, UpdateTaskInput } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Role, TaskStatus, Priority } from '@prisma/client';

export const getAllTasks = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  // Get query parameters
  const priorityFilter = req.query.priority as Priority | undefined;
  const statusFilter = req.query.status as TaskStatus | undefined;
  const assignerIdFilter = req.query.assignerId as string | undefined;
  const createdByRole = req.query.createdByRole as 'ADMIN' | 'USER' | undefined;
  const sortBy = req.query.sortBy as string | undefined;
  const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  
  // Validate priority if provided
  if (priorityFilter && !Object.values(Priority).includes(priorityFilter)) {
    throw new AppError('Invalid priority value. Must be LOW, MEDIUM, or HIGH', 400);
  }

  // Validate status if provided
  if (statusFilter && !Object.values(TaskStatus).includes(statusFilter)) {
    throw new AppError('Invalid status value. Must be TODO, PENDING, or COMPLETED', 400);
  }

  let whereClause: any = {
    isDeleted: false, // Exclude deleted tasks by default
  };

  if (req.user.role === Role.ADMIN) {
    // Admins can see all tasks
    if (priorityFilter) {
      whereClause.priority = priorityFilter;
    }
    if (statusFilter) {
      whereClause.status = statusFilter;
    }
    if (assignerIdFilter) {
      whereClause.assignerId = assignerIdFilter;
    }
    // Filter by assigner role (ADMIN or USER)
    if (createdByRole) {
      whereClause.assigner = {
        role: createdByRole,
      };
    }
  } else {
    // Regular users can only see tasks they created or are assigned to
    whereClause.AND = [
      { isDeleted: false }, // Exclude deleted tasks
      {
        OR: [
          { assignerId: req.user.userId },
          { assigneeId: req.user.userId },
        ],
      },
    ];
    if (priorityFilter) {
      whereClause.AND.push({ priority: priorityFilter });
    }
    if (statusFilter) {
      whereClause.AND.push({ status: statusFilter });
    }
    if (assignerIdFilter) {
      // For users, only allow filtering by their own assignerId or tasks assigned to them
      whereClause.AND.push({ assignerId: assignerIdFilter });
    }
  }

  // Build orderBy clause
  let orderBy: any[] = [];
  if (sortBy) {
    const validSortFields = ['createdAt', 'dueDate', 'priority', 'status', 'title'];
    if (validSortFields.includes(sortBy)) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy.push({ [sortBy]: order });
    }
  }
  
  // Default sorting if no sortBy provided
  if (orderBy.length === 0) {
    orderBy = [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ];
  }

  // Get total count for pagination
  const total = await prisma.task.count({ where: whereClause });

  const tasks = await prisma.task.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      assignerId: true,
      assigneeId: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      assigner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
    data: tasks,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getTaskById = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: { 
      id,
      isDeleted: false, // Exclude deleted tasks
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      assignerId: true,
      assigneeId: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      assigner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { title, description, assigneeId, status, priority }: CreateTaskInput = req.body;

  if (!title) {
    throw new AppError('Title is required', 400);
  }

  // Validate priority if provided
  let taskPriority: Priority = Priority.MEDIUM; // Default priority
  if (priority) {
    if (!Object.values(Priority).includes(priority)) {
      throw new AppError('Invalid priority value. Must be LOW, MEDIUM, or HIGH', 400);
    }
    taskPriority = priority;
  }

  // Handle assigneeId based on user role
  let finalAssigneeId: string | null = null;

  if (assigneeId) {
    // Verify the assignee user exists
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (!assignee) {
      throw new AppError('Assignee not found', 404);
    }

    // Admin can assign to any user, regular users can only assign to themselves
    if (req.user.role === Role.ADMIN) {
      finalAssigneeId = assigneeId;
    } else {
      // Regular users can only assign to themselves
      if (assigneeId !== req.user.userId) {
        throw new AppError('You can only assign tasks to yourself', 403);
      }
      finalAssigneeId = req.user.userId;
    }
  } else {
    // If no assigneeId provided and user is not admin, assign to themselves
    if (req.user.role !== Role.ADMIN) {
      finalAssigneeId = req.user.userId;
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      assignerId: req.user.userId,
      assigneeId: finalAssigneeId,
      status: status || TaskStatus.TODO,
      priority: taskPriority,
      isDeleted: false, // Explicitly set to false (default, but explicit for clarity)
    },
    include: {
      assigner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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
});

export const updateTask = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { title, description, assigneeId, status, priority }: UpdateTaskInput = req.body;

  const task = await prisma.task.findFirst({
    where: { 
      id,
      isDeleted: false, // Only find non-deleted tasks
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to update this task
  // Users can update tasks they created OR tasks assigned to them
  // Admins can update any task
  if (req.user.role !== Role.ADMIN && 
      task.assignerId !== req.user.userId && 
      task.assigneeId !== req.user.userId) {
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
  if (assigneeId !== undefined) {
    // Admin can assign to any user, regular users can only assign to themselves
    if (req.user.role === Role.ADMIN) {
      updateData.assigneeId = assigneeId || null;
    } else {
      // Regular users can only assign to themselves
      if (assigneeId && assigneeId !== req.user.userId) {
        throw new AppError('You can only assign tasks to yourself', 403);
      }
      updateData.assigneeId = assigneeId || req.user.userId;
    }
  }
  if (status !== undefined && status !== null) {
    if (Object.values(TaskStatus).includes(status)) {
      updateData.status = status;
    } else {
      throw new AppError('Invalid status value. Must be TODO, PENDING, or COMPLETED', 400);
    }
  }
  if (priority !== undefined) {
    if (!Object.values(Priority).includes(priority)) {
      throw new AppError('Invalid priority value. Must be LOW, MEDIUM, or HIGH', 400);
    }
    updateData.priority = priority;
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
          role: true,
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

  const task = await prisma.task.findFirst({
    where: { 
      id,
      isDeleted: false, // Only find non-deleted tasks
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to delete this task (only assigner or admin)
  if (req.user.role !== Role.ADMIN && task.assignerId !== req.user.userId) {
    throw new AppError('You do not have permission to delete this task', 403);
  }

  // Soft delete: set isDeleted to true instead of actually deleting
  await prisma.task.update({
    where: { id },
    data: { isDeleted: true },
  });

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
});

