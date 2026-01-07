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
import { requireAdmin } from '../middleware/role';

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

// Admin user management routes
router.get('/users', getAllUsers);
router.post('/users/bulk', createBulkUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/activate', activateUser);
router.patch('/users/:id/deactivate', deactivateUser);

// Admin task routes (admin-only access)
// Admins can access all task endpoints with full permissions
router.use('/tasks', adminTaskRoutes);

export default router;

