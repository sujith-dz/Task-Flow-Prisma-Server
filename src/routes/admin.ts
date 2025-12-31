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
} from '../controllers/adminUserController';
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

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/activate', activateUser);
router.patch('/users/:id/deactivate', deactivateUser);

export default router;

