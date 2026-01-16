import { Request } from 'express';
import { TaskStatus, Priority, Role, Permission } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName?: string;  // Optional: include role name for convenience
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
  assigneeId?: string; // For backward compatibility
  assigneeIds?: string[]; // New: array of assignee IDs
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | Date;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string; // For backward compatibility
  assigneeIds?: string[]; // New: array of assignee IDs
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | Date | null;
}

export interface DragDropTaskInput {
  assigneeIds?: string[]; // Array of assignee IDs for reassignment
  status: TaskStatus; // Status is required for drag-and-drop
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

export interface BulkUserInput {
  email: string;
  password: string;
  name: string;
  roleId?: string;  // Changed from role to roleId
  isActive?: boolean;
}

// New interfaces for role management
export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
}

export interface CreatePermissionInput {
  name: string;
  displayName: string;
  description?: string;
  category: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

