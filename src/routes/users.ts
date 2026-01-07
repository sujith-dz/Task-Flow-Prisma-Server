import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController';
import { uploadImage } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import userTaskRoutes from './userTasks';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', getProfile);
router.get('/me', getProfile); // Alias for /profile, commonly used endpoint
router.put('/profile', updateProfile);
router.post('/upload-image', upload.single('image'), uploadImage);

// User task routes (protected by authentication)
// These routes are accessible to all authenticated users (both USER and ADMIN roles)
// Permission checks are handled in the controllers
router.use('/tasks', userTaskRoutes);

export default router;
