import { Notification, User } from '../models/index.js';
import admin from '../config/firebase.js';

export const sendToUser = async (userId, { type, title, body, data }) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const notification = await Notification.create({
      user: userId,
      type,
      title,
      body,
      data
    });

    if (user.fcmToken && admin) {
      const message = {
        token: user.fcmToken,
        notification: { title, body },
        data: {
          ...data,
          notificationId: notification._id.toString()
        }
      };

      try {
        await admin.messaging().send(message);
      } catch (fcmErr) {
        console.error(`FCM send failed for user ${userId}:`, fcmErr);
      }
    }

    // Socket.io real-time fallback
    const io = global.io;
    if (io) {
      io.to(userId.toString()).emit('new_notification', notification);
    }
  } catch (err) {
    console.error('Error in sendToUser:', err);
  }
};

export const sendToUsers = async (userIds, payload) => {
  for (const userId of userIds) {
    await sendToUser(userId, payload);
  }
};

export const sendBroadcast = async (filter, payload) => {
  const users = await User.find(filter).select('_id');
  const userIds = users.map(u => u._id);
  await sendToUsers(userIds, payload);
};

export const sendLeadAssignedNotification = async (lead) => {
  await sendToUser(lead.assignedTo, {
    type: 'LEAD_ASSIGNED',
    title: 'New Lead Assigned',
    body: `You have been assigned a new lead for dealer.`,
    data: { leadId: lead._id.toString() }
  });
};

export const sendStuckCaseNotification = async (lead) => {
  await sendToUser(lead.assignedTo, {
    type: 'STUCK_CASE',
    title: 'Action Required: Stuck Lead',
    body: `Lead ${lead._id} has been marked as stuck due to inactivity.`,
    data: { leadId: lead._id.toString() }
  });
};
