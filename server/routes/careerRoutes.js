import express from 'express';
import {
  createCareer,
  getBurnoutAnalysis,
  getCareer,
  getRoadmap,
  getTrajectory,
  logCourse,
  logFocusSession,
  updateCareer,
} from '../controllers/careerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getCareer));
router.post('/', authenticateToken, asyncHandler(createCareer));
router.put('/', authenticateToken, asyncHandler(updateCareer));
router.get('/roadmap', authenticateToken, asyncHandler(getRoadmap));
router.get('/trajectory', authenticateToken, asyncHandler(getTrajectory));
router.get('/burnout-analysis', authenticateToken, asyncHandler(getBurnoutAnalysis));
router.post('/course', authenticateToken, logCourse);
router.post('/focus', authenticateToken, logFocusSession);

export default router;
