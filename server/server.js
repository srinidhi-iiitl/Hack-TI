import 'dotenv/config.js';
import express from 'express';
import helmet from 'helmet';
import connectDB from './config/database.js';
import { initializeFirebase } from './config/firebase.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import integrationRoutes from './routes/integrations.js';
import onboardingRoutes from './routes/onboarding.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import careerRoutes from './routes/careerRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { startCaretakerJobs } from './cron/caretaker.js';
import goalRoutes from './routes/goalRoutes.js';

// Initialize Express app
const app = express();

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet());

// CORS middleware
app.use(corsMiddleware);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// INITIALIZE EXTERNAL SERVICES
// ============================================

// Connect to MongoDB
await connectDB();

// Initialize Firebase Admin SDK
initializeFirebase();

// ============================================
// API ROUTES
// ============================================

/**
 * Health Check Endpoint
 * Returns server status
 */
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Authentication Routes
 * Base path: /api/auth
 */
app.use('/api/auth', authRoutes);
app.use('/api', onboardingRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/goals', goalRoutes);
// ✅ Mount the Gamification API Route
app.use('/api/gamification', gamificationRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/health-metrics', healthRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/ai', aiRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 Handler (must be before error handler)
app.use(notFoundHandler);

// Global Error Handler (must be last)
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ✅ Start the Autonomous Background Jobs before the server listens!
startCaretakerJobs();

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║    LifeTwin Backend Server               ║
╚══════════════════════════════════════════╝
  
  🚀 Server running on port: ${PORT}
  📝 Environment: ${NODE_ENV}
  🔗 Base URL: http://localhost:${PORT}
  
  📚 API Documentation:
    - Health Check: GET /api/health
    - Signup: POST /api/auth/signup
    - Login: POST /api/auth/login
    - Get Gamification: GET /api/gamification/me
    - Log Expense: POST /api/finance/expense
    - Log Workout: POST /api/health-metrics/workout
═══════════════════════════════════════════
`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`
Port ${PORT} is already in use.

Close the other server using port ${PORT}, or set a different PORT in server/.env.
On Windows, you can find it with:
  netstat -ano | findstr :${PORT}

Then stop that PID with:
  taskkill /PID <PID> /F
`);
    process.exit(1);
  }

  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => process.exit(0));
});

export default app;