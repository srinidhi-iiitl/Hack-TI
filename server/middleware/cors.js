import cors from 'cors';

/**
 * CORS Configuration
 * Allows requests from specified frontend origins
 */
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  optionsSuccessStatus: 200,
};

/**
 * CORS Middleware
 * Apply to Express app: app.use(corsMiddleware)
 */
export const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
