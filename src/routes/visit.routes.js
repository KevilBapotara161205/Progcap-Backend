import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as visitController from '../controllers/visit.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', visitController.getVisits);

router.post(
  '/check-in',
  restrictTo('RM'),
  [
    body('leadId').notEmpty(),
    body('dealerId').notEmpty(),
    body('latitude').isNumeric(),
    body('longitude').isNumeric()
  ],
  validate,
  visitController.checkIn
);

router.post(
  '/:id/check-out',
  restrictTo('RM'),
  visitController.checkOut
);

router.post(
  '/geofence/config',
  restrictTo('SUPER_ADMIN'),
  visitController.configureGeofence
);

export default router;
