import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as syncController from '../controllers/sync.controller.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('RM'));

router.post(
  '/up',
  [
    body('deviceId').notEmpty(),
    body('queue').isArray()
  ],
  validate,
  syncController.syncUp
);

router.get('/down', syncController.syncDown);

export default router;
