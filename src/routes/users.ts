import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;

