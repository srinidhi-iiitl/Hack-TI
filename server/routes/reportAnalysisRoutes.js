import express from 'express';
import { extractReport, reportUploadMiddleware } from '../controllers/reportAnalysisController.js';

const router = express.Router();

// POST /api/report-analysis/extract
router.post('/extract', reportUploadMiddleware, extractReport);

export default router;

