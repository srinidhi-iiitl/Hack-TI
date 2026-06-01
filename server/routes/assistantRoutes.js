import express from 'express';
import { handleAssistantCommand } from '../controllers/assistantController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/command', authenticateToken, asyncHandler(handleAssistantCommand));

export default router;
