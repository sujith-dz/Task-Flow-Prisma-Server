# Migration Guide: Multiple Assignees per Task

This guide explains how to migrate from single assignee to multiple assignees per task.

## Database Schema Changes

The schema has been updated to support multiple assignees using a many-to-many relationship:

1. **Removed**: `assigneeId` field from `Task` model
2. **Added**: `TaskAssignee` model (junction table)
3. **Added**: `assignees` relation in `Task` model

## Migration Steps

### Step 1: Generate Prisma Client
```bash
cd Task-Flow-Prisma-Server
npm run prisma:generate
```

### Step 2: Create and Run Migration
```bash
npm run prisma:migrate
# Name the migration: add_multiple_assignees
```

### Step 3: Migrate Existing Data
After the migration, run the data migration script to move existing assigneeId values to the new TaskAssignee table:

```bash
npm run migrate-assignees
```

This script will:
- Find all tasks with `assigneeId` set
- Create corresponding `TaskAssignee` records
- Preserve all existing assignments

### Step 4: Verify Migration
Check that all tasks have their assignees properly migrated:
```bash
npm run prisma:studio
```

## API Changes

### Create Task
**Before:**
```json
{
  "title": "Task",
  "assigneeId": "user-id"
}
```

**After:**
```json
{
  "title": "Task",
  "assigneeIds": ["user-id-1", "user-id-2", "user-id-3"]
}
```

**Backward Compatibility:** The API still accepts `assigneeId` (single) for backward compatibility, but `assigneeIds` (array) is preferred.

### Update Task
Same as create - use `assigneeIds` array instead of `assigneeId`.

### Response Format
Tasks now return an `assignees` array:
```json
{
  "id": "task-id",
  "title": "Task",
  "assignees": [
    { "id": "user-1", "name": "User 1", "email": "user1@example.com" },
    { "id": "user-2", "name": "User 2", "email": "user2@example.com" }
  ]
}
```

## Client Changes

The client has been updated to:
- Display multiple assignees as badges in the admin table
- Send `assigneeIds` array when creating tasks
- Handle both old `assignee` and new `assignees` fields for backward compatibility

## Notes

- The old `assigneeId` column will remain in the database until you manually remove it (optional cleanup)
- All existing single-assignee tasks will be migrated automatically
- New tasks should use `assigneeIds` array

