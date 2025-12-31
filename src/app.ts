import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import taskRoutes from './routes/tasks';
import { errorHandler } from './utils/errorHandler';

dotenv.config();

const app: Application = express();

/* ======================
   Global Middleware
====================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================
   CORS Configuration
====================== */
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/tasks', taskRoutes);

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

