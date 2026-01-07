import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, CreateTaskInput, UpdateTaskInput, DragDropTaskInput } from '../types';
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
          { assignees: { some: { userId: req.user.userId } } },
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
      assignees: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  // Transform tasks to include assignees array in a more convenient format
  const transformedTasks = tasks.map((task: any) => ({
    ...task,
    assignees: task.assignees.map((ta: any) => ta.user),
  }));

  res.json({
    success: true,
    data: transformedTasks,
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
      assignees: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to view this task
  const isAssignee = task.assignees.some((ta: any) => ta.user.id === req.user!.userId);
  if (req.user!.role !== Role.ADMIN && task.assignerId !== req.user!.userId && !isAssignee) {
    throw new AppError('You do not have permission to view this task', 403);
  }

  // Transform task to include assignees array
  const transformedTask = {
    ...task,
    assignees: task.assignees.map((ta: any) => ta.user),
  };

  res.json({
    success: true,
    data: transformedTask,
  });
});

export const createTask = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { title, description, assigneeId, assigneeIds, status, priority, dueDate }: CreateTaskInput = req.body;

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

  // Handle assigneeIds - support both single assigneeId (backward compatibility) and assigneeIds array
  let finalAssigneeIds: string[] = [];

  // Use assigneeIds array if provided, otherwise fall back to assigneeId
  const assigneeIdsToProcess = assigneeIds || (assigneeId ? [assigneeId] : []);

  if (assigneeIdsToProcess.length > 0) {
    // Verify all assignee users exist
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIdsToProcess } },
    });

    if (assignees.length !== assigneeIdsToProcess.length) {
      throw new AppError('One or more assignees not found', 404);
    }

    // Admin can assign to any user, regular users can only assign to themselves
    if (req.user.role === Role.ADMIN) {
      finalAssigneeIds = assigneeIdsToProcess;
    } else {
      // Regular users can only assign to themselves
      if (assigneeIdsToProcess.some((id: string) => id !== req.user!.userId)) {
        throw new AppError('You can only assign tasks to yourself', 403);
      }
      finalAssigneeIds = [req.user!.userId];
    }
  } else {
    // If no assigneeIds provided and user is not admin, assign to themselves
    if (req.user!.role !== Role.ADMIN) {
      finalAssigneeIds = [req.user!.userId];
    }
  }

  // Parse dueDate if provided
  let parsedDueDate: Date | null = null;
  if (dueDate) {
    parsedDueDate = dueDate instanceof Date ? dueDate : new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      throw new AppError('Invalid due date format', 400);
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      assignerId: req.user.userId,
      status: status || TaskStatus.TODO,
      priority: taskPriority,
      dueDate: parsedDueDate,
      isDeleted: false, // Explicitly set to false (default, but explicit for clarity)
      assignees: {
        create: finalAssigneeIds.map(userId => ({
          userId,
        })),
      },
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
      assignees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Transform task to include assignees array
  const transformedTask = {
    ...task,
    assignees: task.assignees.map((ta: any) => ta.user),
  };

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: transformedTask,
  });
});

export const updateTask = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { title, description, assigneeId, assigneeIds, status, priority, dueDate }: UpdateTaskInput = req.body;

  const task = await prisma.task.findFirst({
    where: {
      id,
      isDeleted: false, // Only find non-deleted tasks
    },
    include: {
      assignees: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to update this task
  // Users can update tasks they created OR tasks assigned to them
  // Admins can update any task
  const isAssignee = task.assignees.some((ta: any) => ta.userId === req.user!.userId);
  if (req.user!.role !== Role.ADMIN &&
    task.assignerId !== req.user!.userId &&
    !isAssignee) {
    throw new AppError('You do not have permission to update this task', 403);
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;

  // Handle assigneeIds update - support both single assigneeId (backward compatibility) and assigneeIds array
  if (assigneeIds !== undefined || assigneeId !== undefined) {
    const assigneeIdsToProcess = assigneeIds || (assigneeId !== undefined ? (assigneeId ? [assigneeId] : []) : undefined);

    if (assigneeIdsToProcess !== undefined) {
      if (assigneeIdsToProcess.length > 0) {
        // Verify all assignee users exist
        const assignees = await prisma.user.findMany({
          where: { id: { in: assigneeIdsToProcess } },
        });

        if (assignees.length !== assigneeIdsToProcess.length) {
          throw new AppError('One or more assignees not found', 404);
        }

        // Admin can assign to any user, regular users can only assign to themselves
        if (req.user.role === Role.ADMIN) {
          // Delete existing assignees and create new ones
          await prisma.taskAssignee.deleteMany({
            where: { taskId: id },
          });
          updateData.assignees = {
            create: assigneeIdsToProcess.map((userId: string) => ({
              userId,
            })),
          };
        } else {
          // Regular users can only assign to themselves
          if (assigneeIdsToProcess.some((id: string) => id !== req.user!.userId)) {
            throw new AppError('You can only assign tasks to yourself', 403);
          }
          await prisma.taskAssignee.deleteMany({
            where: { taskId: id },
          });
          updateData.assignees = {
            create: [{ userId: req.user!.userId }],
          };
        }
      } else {
        // Empty array - remove all assignees
        await prisma.taskAssignee.deleteMany({
          where: { taskId: id },
        });
      }
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
  if (dueDate !== undefined) {
    if (dueDate === null) {
      updateData.dueDate = null;
    } else {
      const parsedDueDate = dueDate instanceof Date ? dueDate : new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        throw new AppError('Invalid due date format', 400);
      }
      updateData.dueDate = parsedDueDate;
    }
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
      assignees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Transform task to include assignees array
  const transformedTask = {
    ...updatedTask,
    assignees: updatedTask.assignees.map((ta: any) => ta.user),
  };

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: transformedTask,
  });
});

export const updateTaskDragDrop = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { id } = req.params;
  const { assigneeIds, status }: DragDropTaskInput = req.body;

  // Validate status is provided
  if (!status) {
    throw new AppError('Status is required for drag-and-drop updates', 400);
  }

  // Validate status value
  if (!Object.values(TaskStatus).includes(status)) {
    throw new AppError('Invalid status value. Must be TODO, PENDING, or COMPLETED', 400);
  }

  const task = await prisma.task.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      assignees: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has permission to update this task
  const isAssignee = task.assignees.some((ta: any) => ta.userId === req.user!.userId);
  const canUpdate = req.user!.role === Role.ADMIN || task.assignerId === req.user!.userId || isAssignee;
  
  if (!canUpdate) {
    throw new AppError('You do not have permission to update this task', 403);
  }

  const updateData: any = {
    status,
  };

  // Handle assigneeIds update if provided (for reassignment)
  if (assigneeIds !== undefined) {
    // Only admins can reassign tasks via drag-and-drop
    if (req.user.role !== Role.ADMIN) {
      throw new AppError('Only admins can reassign tasks', 403);
    }

    if (assigneeIds.length > 0) {
      // Verify all assignee users exist
      const assignees = await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
      });

      if (assignees.length !== assigneeIds.length) {
        throw new AppError('One or more assignees not found', 404);
      }

      // Delete existing assignees and create new ones
      await prisma.taskAssignee.deleteMany({
        where: { taskId: id },
      });
      updateData.assignees = {
        create: assigneeIds.map((userId: string) => ({
          userId,
        })),
      };
    } else {
      // Empty array - remove all assignees
      await prisma.taskAssignee.deleteMany({
        where: { taskId: id },
      });
    }
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
      assignees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Transform task to include assignees array
  const transformedTask = {
    ...updatedTask,
    assignees: updatedTask.assignees.map((ta: any) => ta.user),
  };

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: transformedTask,
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

