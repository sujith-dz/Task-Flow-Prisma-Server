import { Router } from 'express';
import {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionCategories,
} from '../controllers/permissionController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/role';

const router = Router();

// All permission routes require authentication
router.use(authenticate);

// Get all permissions (admin only)
router.get('/', requireAdmin, getAllPermissions);

// Get permission categories (admin only)
router.get('/categories', requireAdmin, getPermissionCategories);

// Get permission by ID (admin only)
router.get('/:id', requireAdmin, getPermissionById);

// Create new permission (admin only, requires users:create permission)
router.post('/', requirePermission('users:create'), createPermission);

// Update permission (admin only, requires users:edit permission)
router.put('/:id', requirePermission('users:edit'), updatePermission);

// Delete permission (admin only, requires users:delete permission)
router.delete('/:id', requirePermission('users:delete'), deletePermission);

export default router;
