import express from 'express';
import { getNotifications, updateNotifications } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getNotifications));
router.put('/', authenticateToken, asyncHandler(updateNotifications));

export default router;
