# Database Indexes for Performance Optimization

This document explains the database indexes added to improve query performance for task listing, user dashboard, admin filters, and analytics queries.

## Index Strategy

Indexes are added based on common query patterns identified in the application. They significantly improve query performance, especially as the database grows.

## User Model Indexes

### `@@index([role, isActive])`
**Purpose**: Admin user filtering and analytics
- **Queries Optimized**:
  - Get all active admins
  - Get all inactive users
  - User role distribution analytics
- **Performance Gain**: Fast filtering when combining role and active status

### `@@index([isActive])`
**Purpose**: Filter active/inactive users
- **Queries Optimized**:
  - Get all active users
  - Get all inactive users
  - User management filtering
- **Performance Gain**: Quick filtering without scanning all users

### `@@index([role])`
**Purpose**: Role-based queries
- **Queries Optimized**:
  - Count users by role
  - Get all admins
  - Get all regular users
- **Performance Gain**: Fast role-based lookups

## Task Model Indexes

### `@@index([isDeleted, assignerId])`
**Purpose**: User's own tasks (most common query)
- **Queries Optimized**:
  - Get all tasks created by a user
  - User dashboard task listing
  - "My Tasks" view
- **Performance Gain**: **Critical** - This is the most frequent query pattern. Composite index ensures fast lookups.

### `@@index([isDeleted, status])`
**Purpose**: Status filtering
- **Queries Optimized**:
  - Get all TODO tasks
  - Get all COMPLETED tasks
  - Filter tasks by status
- **Performance Gain**: Fast status-based filtering with soft delete exclusion

### `@@index([isDeleted, priority])`
**Purpose**: Priority filtering
- **Queries Optimized**:
  - Get all HIGH priority tasks
  - Filter by priority level
  - Priority-based analytics
- **Performance Gain**: Efficient priority filtering

### `@@index([isDeleted, dueDate])`
**Purpose**: Due date sorting and filtering
- **Queries Optimized**:
  - Sort tasks by due date
  - Get overdue tasks
  - Get tasks due soon
  - Due date range queries
- **Performance Gain**: Fast date-based queries and sorting

### `@@index([isDeleted, createdAt])`
**Purpose**: Creation date sorting
- **Queries Optimized**:
  - Sort by newest/oldest tasks
  - Recent tasks queries
  - Creation date analytics
- **Performance Gain**: Efficient date sorting

### `@@index([isDeleted, assignerId, status])`
**Purpose**: User dashboard with status filter
- **Queries Optimized**:
  - Get user's TODO tasks
  - Get user's COMPLETED tasks
  - User dashboard with status filter
- **Performance Gain**: **High** - Composite index for common dashboard queries

### `@@index([isDeleted, assignerId, priority])`
**Purpose**: User dashboard with priority filter
- **Queries Optimized**:
  - Get user's HIGH priority tasks
  - User dashboard with priority filter
- **Performance Gain**: **High** - Optimizes filtered dashboard views

### `@@index([assignerId])`
**Purpose**: Finding tasks by creator
- **Queries Optimized**:
  - Get all tasks created by a specific user
  - Admin task management filtering
- **Performance Gain**: Fast lookups by creator

### `@@index([status])`
**Purpose**: Status-based analytics
- **Queries Optimized**:
  - Count tasks by status
  - Status distribution charts
  - Analytics queries
- **Performance Gain**: Fast aggregation queries

### `@@index([priority])`
**Purpose**: Priority-based analytics
- **Queries Optimized**:
  - Count tasks by priority
  - Priority distribution charts
  - Analytics queries
- **Performance Gain**: Fast aggregation queries

### `@@index([dueDate])`
**Purpose**: Due date queries
- **Queries Optimized**:
  - Overdue tasks queries
  - Upcoming tasks queries
  - Due date analytics
- **Performance Gain**: Fast date-based queries

### `@@index([createdAt])`
**Purpose**: Creation date queries
- **Queries Optimized**:
  - Recent tasks
  - Tasks over time analytics
  - Creation date sorting
- **Performance Gain**: Fast date-based queries

## TaskAssignee Model Indexes

### `@@index([userId])`
**Purpose**: Finding all tasks assigned to a user
- **Queries Optimized**:
  - Get all tasks assigned to a user
  - User dashboard (assigned tasks)
  - "Tasks assigned to me" view
- **Performance Gain**: **Critical** - Fast lookups for user's assigned tasks

### `@@index([taskId])`
**Purpose**: Finding all assignees of a task
- **Queries Optimized**:
  - Get all users assigned to a task
  - Task detail view
  - Task assignee listing
- **Performance Gain**: Fast reverse lookups

## Performance Impact

### Before Indexes
- Task listing queries: **O(n)** - Full table scan
- User dashboard: **Slow** - Multiple table scans
- Admin filters: **Slow** - Sequential scans
- Analytics: **Very slow** - Full table scans

### After Indexes
- Task listing queries: **O(log n)** - Index scan
- User dashboard: **Fast** - Index-based lookups
- Admin filters: **Fast** - Index-based filtering
- Analytics: **Fast** - Index-based aggregations

## Query Examples Optimized

### User Dashboard
```sql
-- Optimized by: @@index([isDeleted, assignerId, status])
SELECT * FROM tasks 
WHERE isDeleted = false 
  AND assignerId = 'user-id' 
  AND status = 'TODO';
```

### Admin Task Filtering
```sql
-- Optimized by: @@index([isDeleted, status])
SELECT * FROM tasks 
WHERE isDeleted = false 
  AND status = 'COMPLETED';
```

### Assigned Tasks
```sql
-- Optimized by: @@index([userId]) on task_assignees
SELECT t.* FROM tasks t
JOIN task_assignees ta ON t.id = ta.taskId
WHERE ta.userId = 'user-id' AND t.isDeleted = false;
```

### Analytics Queries
```sql
-- Optimized by: @@index([status])
SELECT status, COUNT(*) 
FROM tasks 
WHERE isDeleted = false 
GROUP BY status;
```

## Migration

When you run the migration, Prisma will create all these indexes automatically:

```bash
npm run prisma:migrate dev
# Name: add_performance_indexes
```

## Monitoring

After deployment, monitor query performance:
- Check slow query logs
- Use `EXPLAIN ANALYZE` on PostgreSQL
- Monitor index usage with `pg_stat_user_indexes`

## Maintenance

- Indexes are automatically maintained by PostgreSQL
- They use additional storage space (~10-20% of table size)
- Write operations (INSERT/UPDATE) are slightly slower due to index maintenance
- Read operations are significantly faster

## Best Practices

1. **Composite indexes** are ordered - most selective column first
2. **isDeleted** is included in most indexes since it's in almost every query
3. **Foreign keys** (assignerId, taskId, userId) are indexed for join performance
4. **Sorting columns** (createdAt, dueDate) are indexed for ORDER BY performance

