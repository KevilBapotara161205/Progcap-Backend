import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as kycController from '../controllers/kyc.controller.js';

const router = express.Router();

router.use(protect);

router.post(
  '/upload',
  restrictTo('RM'),
  kycController.uploadMiddleware.single('file'),
  [
    body('leadId').notEmpty(),
    body('dealerId').notEmpty(),
    body('docType').notEmpty()
  ],
  validate,
  kycController.uploadDocument
);

router.get('/lead/:leadId', kycController.getDocumentsByLead);

router.patch(
  '/:id/verify',
  restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'),
  [
    body('status').isIn(['VERIFIED', 'REJECTED'])
  ],
  validate,
  kycController.verifyDocument
);

export default router;
