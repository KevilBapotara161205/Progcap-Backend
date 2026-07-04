import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as anchorController from '../controllers/anchor.controller.js';
import * as dealerController from '../controllers/dealer.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

// --- Anchors ---
router.get('/', anchorController.getAnchors);
router.post(
  '/',
  restrictTo('SUPER_ADMIN'),
  [body('name').notEmpty().withMessage('Name is required')],
  validate,
  anchorController.createAnchor
);
router.get('/:id', anchorController.getAnchorById);
router.patch('/:id', restrictTo('SUPER_ADMIN'), anchorController.updateAnchor);
router.delete('/:id', restrictTo('SUPER_ADMIN'), anchorController.deleteAnchor);

// --- Dealers ---
router.get('/:anchorId/dealers', dealerController.getDealers);
router.post(
  '/:anchorId/dealers',
  restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'),
  [body('businessName').notEmpty().withMessage('Business name is required')],
  validate,
  dealerController.createDealer
);
router.get('/:anchorId/dealers/search', dealerController.searchDealers);
router.get('/:anchorId/dealers/:id', dealerController.getDealerById);
router.patch('/:anchorId/dealers/:id', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), dealerController.updateDealer);
router.delete('/:anchorId/dealers/:id', restrictTo('SUPER_ADMIN'), dealerController.deleteDealer);
router.post(
  '/:anchorId/dealers/bulk-import',
  restrictTo('SUPER_ADMIN', 'RBH'),
  upload.single('file'),
  dealerController.bulkImportDealers
);

export default router;
