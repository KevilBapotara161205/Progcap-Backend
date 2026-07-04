import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect } from '../middlewares/auth.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

router.post(
  '/send-otp',
  [body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone must be 10 digits')],
  validate,
  authController.sendOtp
);

router.post(
  '/verify-otp',
  [
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone must be 10 digits'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  validate,
  authController.verifyOtp
);

router.post(
  '/login-web',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.loginWeb
);

// Alias for backward compatibility with frontend cache
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.loginWeb
);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  authController.refreshToken
);

router.post('/logout', protect, authController.logout);

router.get('/me', protect, authController.getMe);

router.patch(
  '/fcm-token',
  protect,
  [body('fcmToken').isString().notEmpty().withMessage('FCM token is required')],
  validate,
  authController.updateFcmToken
);

export default router;
