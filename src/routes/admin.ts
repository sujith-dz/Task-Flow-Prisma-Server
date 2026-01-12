import { Router } from 'express';
import {
  adminSignup,
  adminLogin,
} from '../controllers/adminAuthController';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  createBulkUsers,
} from '../controllers/adminUserController';
import adminTaskRoutes from './adminTasks';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/role';

const router = Router();

/* ======================
   Admin Authentication Routes
   (No authentication required)
====================== */
router.post('/signup', adminSignup);
router.post('/login', adminLogin);

/* ======================
   Protected Admin Routes
   (Require authentication and admin role)
====================== */
router.use(authenticate);
router.use(requireAdmin);

// Admin user management routes (with permission checks)
router.get('/users', requirePermission('users:view'), getAllUsers);
router.post('/users/bulk', requirePermission('users:create'), createBulkUsers);
router.get('/users/:id', requirePermission('users:view'), getUserById);
router.put('/users/:id', requirePermission('users:edit'), updateUser);
router.delete('/users/:id', requirePermission('users:delete'), deleteUser);
router.patch('/users/:id/activate', requirePermission('users:edit'), activateUser);
router.patch('/users/:id/deactivate', requirePermission('users:edit'), deactivateUser);

// Admin task routes (admin-only access)
// Admins can access all task endpoints with full permissions
router.use('/tasks', adminTaskRoutes);

export default router;

