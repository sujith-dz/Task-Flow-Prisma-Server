import { Router } from 'express';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import {
  uploadTaskDocument,
  deleteTaskDocument,
  downloadTaskDocument,
} from '../controllers/taskDocumentController';
import { documentUpload } from '../middleware/documentUpload';
import { requirePermission } from '../middleware/role';

const router = Router();

// Middleware (authenticate) is already applied in parent route (users.ts)
// All routes here are automatically protected
// Permission middleware checks if user has required permissions from database

router.get('/', requirePermission('tasks:view'), getAllTasks);
router.get('/:id', requirePermission('tasks:view'), getTaskById);
router.post('/', requirePermission('tasks:create'), createTask);
router.put('/:id', requirePermission('tasks:edit'), updateTask);
router.delete('/:id', requirePermission('tasks:delete'), deleteTask);

// Document routes (must be before /:id route to avoid conflicts)
router.post(
  '/documents',
  requirePermission('documents:upload'),
  documentUpload.array('documents', 10),
  uploadTaskDocument
);
router.get('/documents/:documentId/download', requirePermission('documents:download'), downloadTaskDocument);
router.delete('/documents/:documentId', requirePermission('documents:delete'), deleteTaskDocument);

export default router;
