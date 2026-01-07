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
} from '../controllers/taskDocumentController';
import { documentUpload } from '../middleware/documentUpload';

const router = Router();

// Middleware (authenticate) is already applied in parent route (users.ts)
// All routes here are automatically protected

router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Document routes (must be before /:id route to avoid conflicts)
router.post(
  '/documents',
  documentUpload.array('documents', 10),
  uploadTaskDocument
);
router.delete('/documents/:documentId', deleteTaskDocument);

export default router;
