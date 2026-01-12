import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RequestWithUser, CreateRoleInput, UpdateRoleInput } from '../types';
import { AppError, asyncHandler } from '../utils/errorHandler';

// Get all roles
export const getAllRoles = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                displayName: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to include permissions array
    const transformedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
    }));

    res.json({
      success: true,
      data: transformedRoles,
    });
  }
);

// Get role by ID
export const getRoleById = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                displayName: true,
                category: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Transform to include permissions array
    const transformedRole = {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };

    res.json({
      success: true,
      data: transformedRole,
    });
  }
);

// Create new role
export const createRole = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { name, displayName, description, permissionIds }: CreateRoleInput = req.body;

    if (!name || !displayName) {
      throw new AppError('Name and displayName are required', 400);
    }

    // Check if role with same name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.toUpperCase() },
    });

    if (existingRole) {
      throw new AppError('Role with this name already exists', 400);
    }

    // Validate permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
          isActive: true,
        },
      });

      if (permissions.length !== permissionIds.length) {
        throw new AppError('One or more permissions not found or inactive', 400);
      }
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        displayName,
        description,
        permissions: permissionIds && permissionIds.length > 0
          ? {
              create: permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                displayName: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // Transform to include permissions array
    const transformedRole = {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: transformedRole,
    });
  }
);

// Update role
export const updateRole = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, displayName, description, isActive, permissionIds }: UpdateRoleInput = req.body;

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Check if new name conflicts with existing role
    if (name && name.toUpperCase() !== role.name) {
      const existingRole = await prisma.role.findUnique({
        where: { name: name.toUpperCase() },
      });

      if (existingRole) {
        throw new AppError('Role with this name already exists', 400);
      }
    }

    // Validate permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
          isActive: true,
        },
      });

      if (permissions.length !== permissionIds.length) {
        throw new AppError('One or more permissions not found or inactive', 400);
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.toUpperCase();
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update role
    const updatedRole = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                displayName: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // Update permissions if provided
    if (permissionIds !== undefined) {
      // Delete existing role-permission mappings
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Create new mappings
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }

      // Fetch updated role with permissions
      const roleWithPermissions = await prisma.role.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      if (roleWithPermissions) {
        const transformedRole = {
          id: roleWithPermissions.id,
          name: roleWithPermissions.name,
          displayName: roleWithPermissions.displayName,
          description: roleWithPermissions.description,
          isActive: roleWithPermissions.isActive,
          createdAt: roleWithPermissions.createdAt,
          updatedAt: roleWithPermissions.updatedAt,
          permissions: roleWithPermissions.permissions.map((rp) => rp.permission),
        };

        return res.json({
          success: true,
          message: 'Role updated successfully',
          data: transformedRole,
        });
      }
    }

    // Transform to include permissions array
    const transformedRole = {
      id: updatedRole.id,
      name: updatedRole.name,
      displayName: updatedRole.displayName,
      description: updatedRole.description,
      isActive: updatedRole.isActive,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
      permissions: updatedRole.permissions.map((rp) => rp.permission),
    };

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: transformedRole,
    });
  }
);

// Delete role
export const deleteRole = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Check if role is assigned to any users
    if (role.users.length > 0) {
      throw new AppError(
        `Cannot delete role. It is assigned to ${role.users.length} user(s). Please reassign users first.`,
        400
      );
    }

    // Delete role (cascade will delete role-permission mappings)
    await prisma.role.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  }
);

// Get users with a specific role
export const getUsersByRole = asyncHandler(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    const users = await prisma.user.findMany({
      where: { roleId: id },
      select: {
        id: true,
        email: true,
        name: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        role: {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
        },
        users,
        count: users.length,
      },
    });
  }
);
