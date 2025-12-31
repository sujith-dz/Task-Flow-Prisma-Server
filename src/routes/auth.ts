import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// User authentication routes
router.post('/signup', register);
router.post('/login', login);

export default router;

