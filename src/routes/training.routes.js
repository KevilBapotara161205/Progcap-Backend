import express from 'express';
import { protect } from '../middlewares/auth.js';
import * as trainingController from '../controllers/training.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', trainingController.getModules);
router.post('/:id/complete', trainingController.completeModule);

export default router;
