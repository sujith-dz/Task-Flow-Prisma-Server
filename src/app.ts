import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';
import { errorHandler } from './utils/errorHandler';

// Load .env file from the project root (Task-Flow-Prisma-Server directory)
// Handle both development (src/) and production (dist/) paths
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app: Application = express();

/* ======================
   Global Middleware
====================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================
   CORS Configuration
====================== */
// Build allowed origins array - CLIENT_URL is optional
const allowedOrigins: string[] = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter((origin): origin is string => Boolean(origin));

// Log environment variables for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('Environment variables loaded:');
  console.log('CLIENT_URL:', process.env.CLIENT_URL || '(not set)');
  console.log('Allowed origins:', allowedOrigins);
}

app.use((req, res, next) => {
  console.log('--- Incoming Request ---');
  console.log('Origin:', req.headers.origin || 'No Origin');
  console.log('IP:', req.ip);
  console.log('------------------------');
  next();
});


app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) return callback(null, true);
      
      // Allow if origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log for debugging (only in development)
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`CORS blocked origin: ${origin}`);
        }
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);



/* ======================
   Health Check
====================== */
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

/* ======================
   Routes
====================== */
// Auth routes (public)
app.use('/auth', authRoutes);

app.use('/users', userRoutes);

app.use('/admin', adminRoutes);

// Role and Permission management routes (admin only)
app.use('/admin/roles', roleRoutes);
app.use('/admin/permissions', permissionRoutes);


/* ======================
   404 Handler
====================== */
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* ======================
   Error Handler (LAST)
====================== */
app.use(errorHandler);

export default app;

