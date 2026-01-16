import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, CreatePermissionInput } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';

// Get all permissions
export const getAllPermissions = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const category = req.query.category as string | undefined;

    const whereClause: any = {};
    if (category) {
      whereClause.category = category;
    }

    const permissions = await prisma.permission.findMany({
      where: whereClause,
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Transform to include roles array
    const transformedPermissions = permissions.map((permission) => ({
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description,
      category: permission.category,
      isActive: permission.isActive,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
      roles: permission.roles.map((rp) => rp.role),
    }));

    res.json({
      success: true,
      data: transformedPermissions,
    });
  }
);

// Get permission by ID
export const getPermissionById = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    // Transform to include roles array
    const transformedPermission = {
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description,
      category: permission.category,
      isActive: permission.isActive,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
      roles: permission.roles.map((rp) => rp.role),
    };

    res.json({
      success: true,
      data: transformedPermission,
    });
  }
);

// Create new permission
export const createPermission = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { name, displayName, description, category }: CreatePermissionInput = req.body;

    if (!name || !displayName || !category) {
      throw new AppError('Name, displayName, and category are required', 400);
    }

    // Check if permission with same name already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { name },
    });

    if (existingPermission) {
      throw new AppError('Permission with this name already exists', 400);
    }

    // Create permission
    const permission = await prisma.permission.create({
      data: {
        name,
        displayName,
        description,
        category,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: permission,
    });
  }
);

// Update permission
export const updatePermission = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, displayName, description, category, isActive } = req.body;

    const permission = await prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    // Check if new name conflicts with existing permission
    if (name && name !== permission.name) {
      const existingPermission = await prisma.permission.findUnique({
        where: { name },
      });

      if (existingPermission) {
        throw new AppError('Permission with this name already exists', 400);
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Check if at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      throw new AppError('At least one field must be provided for update', 400);
    }

    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedPermission,
    });
  }
);

// Delete permission
export const deletePermission = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    // Check if permission is assigned to any roles
    if (permission.roles.length > 0) {
      throw new AppError(
        `Cannot delete permission. It is assigned to ${permission.roles.length} role(s). Please remove from roles first.`,
        400
      );
    }

    // Delete permission (cascade will delete role-permission mappings)
    await prisma.permission.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Permission deleted successfully',
    });
  }
);

// Get permission categories
export const getPermissionCategories = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const categories = await prisma.permission.findMany({
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    const categoryList = categories.map((c) => c.category);

    res.json({
      success: true,
      data: categoryList,
    });
  }
);
