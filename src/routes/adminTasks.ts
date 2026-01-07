import { Router } from 'express';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskDragDrop,
} from '../controllers/taskController';

const router = Router();

// Middleware (authenticate + requireAdmin) is already applied in parent route (admin.ts)
// All routes here are automatically protected and admin-only

router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/drag-drop', updateTaskDragDrop);

export default router;
