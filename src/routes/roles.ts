import { Router } from 'express';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getUsersByRole,
} from '../controllers/roleController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/role';

const router = Router();

// All role routes require authentication
router.use(authenticate);

// Get all roles (admin only)
router.get('/', requireAdmin, getAllRoles);

// Get role by ID (admin only)
router.get('/:id', requireAdmin, getRoleById);

// Create new role (admin only, requires users:create permission)
router.post('/', requirePermission('users:create'), createRole);

// Update role (admin only, requires users:edit permission)
router.put('/:id', requirePermission('users:edit'), updateRole);

// Delete role (admin only, requires users:delete permission)
router.delete('/:id', requirePermission('users:delete'), deleteRole);

// Get users with a specific role (admin only)
router.get('/:id/users', requireAdmin, getUsersByRole);

export default router;
