import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect); // All user routes protected

router.get('/', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), userController.getUsers);

router.post(
  '/',
  restrictTo('SUPER_ADMIN'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone must be 10 digits'),
    body('role').isIn(['SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER', 'RM']).withMessage('Invalid role')
  ],
  validate,
  userController.createUser
);

router.get('/:id', userController.getUserById);

router.patch(
  '/:id',
  restrictTo('SUPER_ADMIN', 'RBH'),
  userController.updateUser
);

router.delete('/:id', restrictTo('SUPER_ADMIN'), userController.deleteUser);

router.post(
  '/bulk-import',
  restrictTo('SUPER_ADMIN'),
  upload.single('file'),
  userController.bulkImport
);

export default router;
