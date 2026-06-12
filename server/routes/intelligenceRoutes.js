import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDocumentary } from '../controllers/intelligenceController.js';

const router = express.Router();

router.get('/documentary', authenticateToken, getDocumentary);

export default router;
