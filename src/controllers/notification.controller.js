import { Notification } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { buildPagination, paginateQuery } from '../utils/pagination.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const { isRead } = req.query;
    const filter = { user: req.user._id };
    
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const options = buildPagination(req.query);
    const result = await paginateQuery(Notification, filter, options);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return error(res, 'Notification not found', 404);
    }

    return success(res, notification, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return success(res, {}, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};
