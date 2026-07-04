import express from 'express';
import { protect } from '../middlewares/auth.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(protect); // Ensure all dashboard endpoints require authentication

router.get('/summary', dashboardController.getSummary);

export default router;
