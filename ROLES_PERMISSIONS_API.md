# Roles and Permissions API Documentation

## Overview
This document describes the API endpoints for managing roles and permissions in the Task Flow application.

## Base URL
All endpoints are prefixed with `/admin/roles` or `/admin/permissions`

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Roles API Endpoints

### 1. Get All Roles
**GET** `/admin/roles`

**Description**: Retrieve all roles with their associated permissions.

**Permissions**: Admin only

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "USER",
      "displayName": "User",
      "description": "Standard user role",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "permissions": [
        {
          "id": "uuid",
          "name": "tasks:create",
          "displayName": "Create Task",
          "category": "tasks"
        }
      ]
    }
  ]
}
```

### 2. Get Role by ID
**GET** `/admin/roles/:id`

**Description**: Retrieve a specific role by ID with its permissions.

**Permissions**: Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "USER",
    "displayName": "User",
    "description": "Standard user role",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "permissions": [...]
  }
}
```

### 3. Create Role
**POST** `/admin/roles`

**Description**: Create a new role with optional permissions.

**Permissions**: Admin with `users:create` permission

**Request Body**:
```json
{
  "name": "MANAGER",
  "displayName": "Manager",
  "description": "Manager role with elevated permissions",
  "permissionIds": ["permission-id-1", "permission-id-2"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": "uuid",
    "name": "MANAGER",
    "displayName": "Manager",
    "description": "Manager role with elevated permissions",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "permissions": [...]
  }
}
```

### 4. Update Role
**PUT** `/admin/roles/:id`

**Description**: Update an existing role.

**Permissions**: Admin with `users:edit` permission

**Request Body** (all fields optional):
```json
{
  "name": "MANAGER",
  "displayName": "Manager",
  "description": "Updated description",
  "isActive": true,
  "permissionIds": ["permission-id-1", "permission-id-2"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "id": "uuid",
    "name": "MANAGER",
    "displayName": "Manager",
    "description": "Updated description",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "permissions": [...]
  }
}
```

### 5. Delete Role
**DELETE** `/admin/roles/:id`

**Description**: Delete a role. Cannot delete if role is assigned to users.

**Permissions**: Admin with `users:delete` permission

**Response**:
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Error Response** (if role is assigned to users):
```json
{
  "success": false,
  "message": "Cannot delete role. It is assigned to 5 user(s). Please reassign users first."
}
```

### 6. Get Users by Role
**GET** `/admin/roles/:id/users`

**Description**: Get all users assigned to a specific role.

**Permissions**: Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "role": {
      "id": "uuid",
      "name": "USER",
      "displayName": "User"
    },
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "imageUrl": null,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

## Permissions API Endpoints

### 1. Get All Permissions
**GET** `/admin/permissions`

**Description**: Retrieve all permissions with their associated roles.

**Query Parameters**:
- `category` (optional): Filter by category (e.g., "tasks", "users", "documents")

**Permissions**: Admin only

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "tasks:create",
      "displayName": "Create Task",
      "description": "Permission to create new tasks",
      "category": "tasks",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "roles": [
        {
          "id": "uuid",
          "name": "USER",
          "displayName": "User"
        }
      ]
    }
  ]
}
```

### 2. Get Permission Categories
**GET** `/admin/permissions/categories`

**Description**: Get list of all permission categories.

**Permissions**: Admin only

**Response**:
```json
{
  "success": true,
  "data": ["tasks", "users", "documents", "admin"]
}
```

### 3. Get Permission by ID
**GET** `/admin/permissions/:id`

**Description**: Retrieve a specific permission by ID with its associated roles.

**Permissions**: Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "tasks:create",
    "displayName": "Create Task",
    "description": "Permission to create new tasks",
    "category": "tasks",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "roles": [...]
  }
}
```

### 4. Create Permission
**POST** `/admin/permissions`

**Description**: Create a new permission.

**Permissions**: Admin with `users:create` permission

**Request Body**:
```json
{
  "name": "tasks:export",
  "displayName": "Export Tasks",
  "description": "Permission to export tasks",
  "category": "tasks"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Permission created successfully",
  "data": {
    "id": "uuid",
    "name": "tasks:export",
    "displayName": "Export Tasks",
    "description": "Permission to export tasks",
    "category": "tasks",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Update Permission
**PUT** `/admin/permissions/:id`

**Description**: Update an existing permission.

**Permissions**: Admin with `users:edit` permission

**Request Body** (all fields optional):
```json
{
  "name": "tasks:export",
  "displayName": "Export Tasks",
  "description": "Updated description",
  "category": "tasks",
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Permission updated successfully",
  "data": {
    "id": "uuid",
    "name": "tasks:export",
    "displayName": "Export Tasks",
    "description": "Updated description",
    "category": "tasks",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Delete Permission
**DELETE** `/admin/permissions/:id`

**Description**: Delete a permission. Cannot delete if permission is assigned to roles.

**Permissions**: Admin with `users:delete` permission

**Response**:
```json
{
  "success": true,
  "message": "Permission deleted successfully"
}
```

**Error Response** (if permission is assigned to roles):
```json
{
  "success": false,
  "message": "Cannot delete permission. It is assigned to 3 role(s). Please remove from roles first."
}
```

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Role not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

## Example Usage

### Creating a Manager Role with Specific Permissions

```bash
# 1. Get all permissions to find IDs
GET /admin/permissions

# 2. Create role with selected permissions
POST /admin/roles
{
  "name": "MANAGER",
  "displayName": "Manager",
  "description": "Manager role",
  "permissionIds": [
    "permission-id-for-tasks:view",
    "permission-id-for-tasks:edit",
    "permission-id-for-tasks:assign",
    "permission-id-for-users:view"
  ]
}

# 3. Assign role to a user (via user update endpoint)
PUT /admin/users/:userId
{
  "roleId": "manager-role-id"
}
```

## Notes

1. **Role Names**: Role names are automatically converted to uppercase (e.g., "manager" becomes "MANAGER")

2. **Permission Names**: Use the format `resource:action` (e.g., `tasks:create`, `users:delete`)

3. **Categories**: Common categories include:
   - `tasks`: Task-related permissions
   - `users`: User management permissions
   - `documents`: Document-related permissions
   - `admin`: Administrative permissions

4. **Deletion Restrictions**:
   - Roles cannot be deleted if assigned to users
   - Permissions cannot be deleted if assigned to roles

5. **Default Roles**: The system comes with two default roles:
   - `USER`: Standard user with basic permissions
   - `ADMIN`: Administrator with all permissions
