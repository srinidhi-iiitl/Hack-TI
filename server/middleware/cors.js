import cors from 'cors';

export const corsMiddleware = cors({
  origin: [
    'http://localhost:5173', 
    'https://digitaltwin-qg6ysnmdc-gargin2012.vercel.app'
  ],
  credentials: true,
});

export default corsMiddleware;