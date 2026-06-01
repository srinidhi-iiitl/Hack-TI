import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getSettings));
router.put('/', authenticateToken, asyncHandler(updateSettings));

export default router;
