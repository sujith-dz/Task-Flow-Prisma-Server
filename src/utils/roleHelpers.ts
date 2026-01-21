import prisma from '../config/database';

// Get user's role with permissions
export async function getUserRoleWithPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
            where: {
              permission: {
                isActive: true,
              },
            },
          },
        },
      },
    },
  });

  return user?.role;
}

// Check if user has a specific permission
export async function userHasPermission(userId: string, permissionName: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user?.role || !user.role.isActive) return false;

  return user.role.permissions.some(
    (rp) => rp.permission.name === permissionName && rp.permission.isActive
  );
}

// Check if user has any of the specified permissions
export async function userHasAnyPermission(
  userId: string,
  permissionNames: string[]
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user?.role || !user.role.isActive) return false;

  // console.log(user.role.permissions, '.....................user.role.permissions');

  return user.role.permissions.some(
    (rp) => permissionNames.includes(rp.permission.name) && rp.permission.isActive
  );
}

// Check if user has a specific role
export async function userHasRole(userId: string, roleName: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  return user?.role?.name === roleName && user.role.isActive === true;
}

// Get all permissions for a role
export async function getRolePermissions(roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
        where: {
          permission: {
            isActive: true,
          },
        },
      },
    },
  });

  return role?.permissions.map((rp) => rp.permission) || [];
}

// Get role by name
export async function getRoleByName(roleName: string) {
  return await prisma.role.findUnique({
    where: { name: roleName },
  });
}

// Get default USER role ID (for new user registration)
export async function getDefaultRoleId(): Promise<string> {
  const userRole = await prisma.role.findUnique({
    where: { name: 'USER' },
  });

  if (!userRole) {
    throw new Error('Default USER role not found in database');
  }

  return userRole.id;
}

// Check if user is admin (quick check using roleId from JWT)
export async function isUserAdmin(userId: string): Promise<boolean> {
  return await userHasRole(userId, 'ADMIN');
}
