/**
 * AI Routes — Progcap SFA
 * Mounted at /api/v1/ai
 * All routes are behind auth middleware.
 * Separate rate limiter (30 req per 15 min per IP).
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as aiController from '../controllers/ai.controller.js';

const router = express.Router();

// AI-specific rate limiter — more lenient than auth routes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 AI requests per 15 minutes per IP
  message: 'Too many AI requests. Please wait a moment before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply auth + rate limit to all AI routes
router.use(protect);
router.use(aiLimiter);

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', aiController.aiHealth);

// ── Feature 1: Merchant X-Ray (RM, RBH, CM, SUPER_ADMIN) ─────────────────────
router.post('/merchant-xray',
  restrictTo('RM', 'RBH', 'CLUSTER_MANAGER', 'SUPER_ADMIN'),
  aiController.merchantXray
);

// ── Feature 3: Visit Summary (RM) ────────────────────────────────────────────
router.post('/visit-summary',
  restrictTo('RM', 'RBH', 'CLUSTER_MANAGER', 'SUPER_ADMIN'),
  aiController.visitSummary
);

// ── Feature 3: Visit Assistant Prep (RM, RBH, CM) ────────────────────────────
router.post('/visit-assistant',
  restrictTo('RM', 'RBH', 'CLUSTER_MANAGER'),
  aiController.visitAssistant
);

// ── Feature 4: NBA Explanation (RM, RBH) ─────────────────────────────────────
router.post('/nba-explain',
  restrictTo('RM', 'RBH', 'CLUSTER_MANAGER'),
  aiController.nbaExplain
);

// ── Feature 5: RM Daily Brief (RM) ───────────────────────────────────────────
router.get('/daily-brief',
  restrictTo('RM'),
  aiController.dailyBrief
);

// ── Feature 6: Follow-up Suggestions (RM, RBH) ───────────────────────────────
router.post('/follow-up',
  restrictTo('RM', 'RBH', 'CLUSTER_MANAGER'),
  aiController.followUpSuggestions
);

// ── Feature 7: Document Review (RM, SUPER_ADMIN) ─────────────────────────────
router.post('/document-review',
  restrictTo('RM', 'RBH', 'CLUSTER_MANAGER', 'SUPER_ADMIN'),
  aiController.documentReview
);

// ── Feature 8: Smart Search / NL Filters (all authenticated) ─────────────────
router.post('/smart-search', aiController.smartSearch);

// ── Feature 9: Manager Insights (RBH, CM) ────────────────────────────────────
router.get('/manager-insights',
  restrictTo('RBH', 'CLUSTER_MANAGER'),
  aiController.managerInsights
);

// ── Feature 10: Admin Insights (SUPER_ADMIN) ─────────────────────────────────
router.get('/admin-insights',
  restrictTo('SUPER_ADMIN'),
  aiController.adminInsights
);

export default router;
