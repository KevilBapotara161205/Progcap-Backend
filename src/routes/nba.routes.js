import express from 'express';
import { getInsights, completeNba, checkinNba } from '../controllers/nba.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getInsights);
router.post('/:leadId/checkin', checkinNba);
router.post('/:leadId/complete', completeNba);

export default router;
