import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  deleteHealthIntegration,
  getHealthIntegration,
  updateHealthIntegration,
} from '../controllers/healthIntegrationController.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getHealthIntegration));
router.put('/', authenticateToken, asyncHandler(updateHealthIntegration));
router.delete('/', authenticateToken, asyncHandler(deleteHealthIntegration));

export default router;
