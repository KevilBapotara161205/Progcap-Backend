import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as leadController from '../controllers/lead.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', leadController.getLeads);
router.post('/', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), leadController.createLead);
router.get('/my', restrictTo('RM'), leadController.getMyLeads);
router.get('/stuck', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), leadController.getStuckLeads);
router.post('/self-source', restrictTo('RM'), leadController.selfSourceLead);
router.get('/:id', leadController.getLeadById);
router.patch('/:id/stage', leadController.updateStage);
router.patch('/:id/kyc-complete', leadController.completeKyc);
router.patch('/:id/assign', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), leadController.assignLead);
router.patch('/:id/flag-urgent', leadController.toggleUrgent);

export default router;
