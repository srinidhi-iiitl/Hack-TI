import express from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getProfile));
router.put('/', authenticateToken, asyncHandler(updateProfile));

export default router;
