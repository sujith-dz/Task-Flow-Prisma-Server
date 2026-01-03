import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import taskRoutes from './routes/tasks';
import { errorHandler } from './utils/errorHandler';

// Load .env file from the project root (Task-Flow-Prisma-Server directory)
// Handle both development (src/) and production (dist/) paths
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app: Application = express();

/* ======================
   CORS Configuration (MUST BE FIRST)
====================== */
// Build allowed origins array - CLIENT_URL is optional
const allowedOrigins: string[] = [
  "https://taskflowappnow.netlify.app",
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter((origin): origin is string => Boolean(origin));

// Log environment variables for debugging (always log in production for CORS debugging)
console.log('CORS Configuration:');
console.log('NODE_ENV:', process.env.NODE_ENV || '(not set)');
console.log('CLIENT_URL:', process.env.CLIENT_URL || '(not set)');
console.log('Allowed origins:', allowedOrigins);

// CORS middleware - MUST be before all other middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // #region agent log
      console.log('[CORS DEBUG] Origin check started:', { origin: origin || 'null', allowedOrigins });
      // #endregion
      
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) {
        // #region agent log
        console.log('[CORS DEBUG] No origin - allowing request');
        // #endregion
        return callback(null, true);
      }
      
      // Normalize origin (remove trailing slash, convert to lowercase)
      const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');
      
      // #region agent log
      console.log('[CORS DEBUG] Origin normalized:', { original: origin, normalized: normalizedOrigin });
      // #endregion
      
      // Check if origin matches any allowed origin (case-insensitive, no trailing slash)
      const isAllowed = allowedOrigins.some(allowed => 
        allowed.toLowerCase().replace(/\/$/, '') === normalizedOrigin
      );
      
      // #region agent log
      console.log('[CORS DEBUG] Origin allowed check:', { isAllowed, allowedOrigins });
      // #endregion
      
      // Also allow all Netlify preview deployments
      const isNetlify = normalizedOrigin.includes('.netlify.app');
      
      // #region agent log
      console.log('[CORS DEBUG] Netlify check:', { isNetlify, normalizedOrigin });
      // #endregion
      
      if (isAllowed || isNetlify) {
        // #region agent log
        console.log('[CORS DEBUG] ✅ CORS ALLOWED:', { origin, isAllowed, isNetlify });
        // #endregion
        callback(null, true);
      } else {
        // #region agent log
        console.error('[CORS DEBUG] ❌ CORS BLOCKED:', { origin, normalizedOrigin, isAllowed, isNetlify, allowedOrigins });
        // #endregion
        // Log for debugging
        console.warn(`CORS blocked origin: ${origin} (normalized: ${normalizedOrigin})`);
        console.warn(`Allowed origins:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

/* ======================
   Global Middleware
====================== */
// Request logging middleware for debugging
app.use((req, res, next) => {
  // #region agent log
  console.log('[REQUEST]', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin || 'none',
    'user-agent': req.headers['user-agent']?.substring(0, 50) || 'none'
  });
  // #endregion
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cors())


/* ======================
   Manual OPTIONS Handler (Fallback for Preflight)
====================== */
app.options('*', (req, res) => {
  // #region agent log
  console.log('[OPTIONS] Preflight request:', {
    origin: req.headers.origin || 'none',
    'access-control-request-method': req.headers['access-control-request-method'] || 'none',
    'access-control-request-headers': req.headers['access-control-request-headers'] || 'none'
  });
  // #endregion
  
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');
    const isNetlify = normalizedOrigin.includes('.netlify.app');
    const isAllowed = allowedOrigins.some(allowed => 
      allowed.toLowerCase().replace(/\/$/, '') === normalizedOrigin
    );
    
    if (isAllowed || isNetlify) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      // #region agent log
      console.log('[OPTIONS] ✅ Preflight allowed:', { origin });
      // #endregion
    } else {
      // #region agent log
      console.log('[OPTIONS] ❌ Preflight blocked:', { origin, normalizedOrigin });
      // #endregion
    }
  }
  res.status(204).send();
});

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

