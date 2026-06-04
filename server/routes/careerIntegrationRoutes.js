import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getCareerIntegrations,
  getLeetcodeActivityCalendar,
  getLeetcodeCareerStats,
  updateCareerIntegrations,
} from '../controllers/careerIntegrationController.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getCareerIntegrations));
router.get('/leetcode-activity', authenticateToken, asyncHandler(getLeetcodeActivityCalendar));
router.get('/leetcode-stats', authenticateToken, asyncHandler(getLeetcodeCareerStats));
router.put('/', authenticateToken, asyncHandler(updateCareerIntegrations));

export default router;
