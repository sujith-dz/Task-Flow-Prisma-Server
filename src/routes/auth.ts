import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

router.post('/signup', register);
router.post('/login', login);

export default router;

