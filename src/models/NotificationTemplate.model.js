import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'LEAD_ASSIGNED',
        'STUCK_CASE',
        'SANCTION_EXPIRY',
        'SYNC_STATUS',
        'BROADCAST',
      ],
    },
    title: { type: String },
    bodyTemplate: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('NotificationTemplate', notificationTemplateSchema);
