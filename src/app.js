import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middlewares/errorHandler.js';
import { error } from './utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import orgRoutes from './routes/org.routes.js';
import anchorRoutes from './routes/anchor.routes.js';
import leadRoutes from './routes/lead.routes.js';
import visitRoutes from './routes/visit.routes.js';
import kycRoutes from './routes/kyc.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import syncRoutes from './routes/sync.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import nbaRoutes from './routes/nba.routes.js';
import trainingRoutes from './routes/training.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(compression());

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/v1/auth', authLimiter);

// Routes mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/org', orgRoutes);
app.use('/api/v1/anchors', anchorRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/visits', visitRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/nba', nbaRoutes);
// app.use('/api/v1/beat-plan', beatPlanRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/notifications', notificationRoutes);
// app.use('/api/v1/scorecard', scorecardRoutes);
// app.use('/api/v1/reports', reportRoutes);
// app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Progcap SFA API is running' });
});

// 404 Handler
app.use((req, res, next) => {
  error(res, `Not Found - ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use(errorHandler);

export default app;
