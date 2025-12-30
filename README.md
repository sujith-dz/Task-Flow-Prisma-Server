# Task Flow Server

A RESTful API server built with Express.js, TypeScript, Prisma ORM, and JWT authentication. This server provides CRUD operations for tasks with user and admin role-based access control.

## Features

- **Authentication**: JWT-based authentication with secure password hashing (bcrypt)
- **Role-Based Access Control**: User and Admin roles with protected routes
- **Task Management**: Full CRUD operations for tasks with assigner/assignee relationships
- **User Management**: Profile management for users, admin user management
- **TypeScript**: Fully typed codebase for better developer experience
- **Prisma ORM**: Type-safe database access with PostgreSQL

## Tech Stack

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the server directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/taskflow?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
PORT=3000
```

4. Set up the database:
```bash
# Generate Prisma Client (schema is in prisma/)
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

## Running the Server

Development mode (with hot reload):
```bash
npm run dev
```

Build and run production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register a new user
  - Body: `{ "email": "user@example.com", "password": "password123", "name": "John Doe" }`
  - Returns: User object and JWT token

- `POST /api/auth/login` - Login
  - Body: `{ "email": "user@example.com", "password": "password123" }`
  - Returns: User object and JWT token

### User Routes (Protected - Requires JWT)

- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
  - Body: `{ "name": "New Name", "email": "newemail@example.com", "password": "newpassword" }` (all fields optional)

### Admin Routes (Protected - Requires JWT + Admin Role)

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user (can change role)
  - Body: `{ "name": "Name", "email": "email@example.com", "password": "password", "role": "ADMIN" }` (all fields optional)
- `DELETE /api/admin/users/:id` - Delete user

### Task Routes (Protected - Requires JWT)

- `GET /api/tasks` - Get all tasks (users see their tasks, admins see all)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create a new task
  - Body: `{ "title": "Task Title", "description": "Task description", "assigneeId": "user-uuid", "status": "PENDING" }`
  - Status options: `PENDING`, `IN_PROGRESS`, `COMPLETED`
- `PUT /api/tasks/:id` - Update task (only assigner or admin can update)
  - Body: `{ "title": "New Title", "description": "New description", "assigneeId": "user-uuid", "status": "IN_PROGRESS" }` (all fields optional)
- `DELETE /api/tasks/:id` - Delete task (only assigner or admin can delete)

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

### User Model
- `id`: UUID (primary key)
- `email`: String (unique)
- `password`: String (hashed)
- `name`: String
- `role`: Enum (USER | ADMIN)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Task Model
- `id`: UUID (primary key)
- `title`: String
- `description`: String (optional)
- `status`: Enum (PENDING | IN_PROGRESS | COMPLETED)
- `assignerId`: UUID (foreign key to User - who created/assigned the task)
- `assigneeId`: UUID (foreign key to User, optional - who receives the task)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## Security Features

- Passwords are hashed using bcrypt (10 rounds)
- JWT tokens expire after 24 hours (configurable)
- Protected routes require valid JWT tokens
- Admin routes require ADMIN role
- Users can only access/modify their own tasks (except admins)
- CORS configured for cross-origin requests

## Project Structure (MVC Pattern)

```
server/
├── prisma/              # Prisma schema and migrations
│   └── schema.prisma
├── src/
│   ├── config/          # Configuration files (database, JWT)
│   ├── controllers/     # Controllers (business logic)
│   ├── middleware/      # Middleware (auth, role-based access)
│   ├── routes/          # Routes (API endpoints)
│   ├── services/        # Services (reusable business logic)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (error handling)
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── dist/                # Compiled JavaScript (generated)
├── node_modules/        # Dependencies (generated)
├── package.json
├── package-lock.json
├── tsconfig.json
└── nodemon.json
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Error Handling

The API returns standardized error responses:
```json
{
  "success": false,
  "message": "Error message"
}
```

Success responses:
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

## License

ISC

