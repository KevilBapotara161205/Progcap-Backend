import express from 'express';
import { protect } from '../middlewares/auth.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = express.Router();

router.use(protect);

router.get('/my', notificationController.getMyNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

export default router;
