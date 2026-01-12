# Roles and Permissions System Migration Guide

## Overview
This migration implements a comprehensive roles and permissions system, replacing the simple enum-based role system with a flexible, database-driven approach.

## Changes Made

### 1. Database Schema Updates
- **User Table**: Changed from `role` enum to `roleId` foreign key
- **New Tables Created**:
  - `roles`: Stores role definitions (USER, ADMIN, and future roles)
  - `permissions`: Stores permission definitions (tasks:create, users:edit, etc.)
  - `role_permissions`: Maps roles to permissions
  - `documents`: Separated document storage (optimized structure)
  - `task_document_mappings`: Maps tasks to documents (replaces direct relation)

### 2. Code Updates
- **Types** (`src/types/index.ts`): Updated JWT payload to use `roleId` and `roleName`
- **Role Helpers** (`src/utils/roleHelpers.ts`): New utility functions for permission checks
- **Middleware** (`src/middleware/role.ts`): Updated to use permission-based checks
- **Controllers**: All controllers updated to use new role/permission system
- **Routes**: Updated to use permission-based middleware

### 3. Default Permissions Created
- **Task Permissions**: tasks:create, tasks:edit, tasks:delete, tasks:view, tasks:assign
- **User Permissions**: users:create, users:edit, users:delete, users:view
- **Document Permissions**: documents:upload, documents:download, documents:delete

### 4. Default Role-Permission Mappings
- **USER Role**: Can create, edit, delete, and view their own tasks; can upload/download documents
- **ADMIN Role**: Has all permissions (full system access)

## Migration Steps

### Step 1: Review the Migration
Review the migration file: `prisma/migrations/20260109164215_add_roles_permissions_system/migration.sql`

### Step 2: Generate Prisma Client
```bash
cd Task-Flow-Prisma-Server
npx prisma generate
```

### Step 3: Run the Migration
```bash
npx prisma migrate deploy
```

Or for development:
```bash
npx prisma migrate dev
```

### Step 4: Verify Migration
1. Check that roles table has USER and ADMIN roles
2. Check that permissions table has all default permissions
3. Check that role_permissions table has proper mappings
4. Verify existing users have been assigned roleIds
5. Verify documents have been migrated to new structure

### Step 5: Test the Application
1. Test user registration (should assign USER role)
2. Test admin login (should work with new role system)
3. Test task creation/editing (should check permissions)
4. Test document upload/download (should use new structure)

### Step 6: Clean Up (After Verification)
Once you've verified everything works, you can drop the old columns:
```sql
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
DROP TABLE IF EXISTS "task_documents";
```

Uncomment these lines in the migration file and run again, or run manually.

## Important Notes

1. **JWT Tokens**: Existing JWT tokens will be invalid after this migration. Users will need to log in again.

2. **Backward Compatibility**: The API responses still include `role` as a string (role name) for backward compatibility with the frontend.

3. **Permission Checks**: Controllers now check permissions in addition to roles. This provides more granular access control.

4. **Document Structure**: Documents are now stored separately and mapped to tasks. This allows:
   - One document to be attached to multiple tasks (if needed in future)
   - Better optimization and normalization
   - Easier document management

## Adding New Roles

To add a new role (e.g., MANAGER):

1. Insert into `roles` table:
```sql
INSERT INTO "roles" ("id", "name", "displayName", "description", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'MANAGER', 'Manager', 'Manager role description', true, NOW(), NOW());
```

2. Assign permissions via `role_permissions` table

3. Update users with the new `roleId`

## Adding New Permissions

To add a new permission:

1. Insert into `permissions` table:
```sql
INSERT INTO "permissions" ("id", "name", "displayName", "description", "category", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'tasks:export', 'Export Tasks', 'Permission to export tasks', 'tasks', true, NOW(), NOW());
```

2. Map to roles via `role_permissions` table

## Troubleshooting

### Linter Errors
If you see TypeScript errors about `role` not existing, run:
```bash
npx prisma generate
```

### Migration Fails
- Check database connection
- Verify existing data integrity
- Review migration SQL for conflicts

### Permission Checks Not Working
- Verify role_permissions table has correct mappings
- Check that user's roleId is correct
- Ensure role.isActive = true and permission.isActive = true

## API Changes

### Request Changes
- User creation: Use `roleId` instead of `role` enum
- User update: Use `roleId` instead of `role` enum

### Response Changes
- User objects still include `role` as string (for backward compatibility)
- JWT tokens now include `roleId` and `roleName`

## Next Steps

1. Update frontend to handle new JWT structure (if needed)
2. Add role management UI for admins
3. Add permission management UI for admins
4. Consider adding role hierarchy if needed
5. Add audit logging for role/permission changes
