import { Request } from 'express';
import { Role, TaskStatus } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user?: JWTPayload;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

