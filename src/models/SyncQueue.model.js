import mongoose from 'mongoose';

const syncQueueSchema = new mongoose.Schema(
  {
    deviceId: { type: String },
    rm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionType: {
      type: String,
      enum: [
        'LEAD_STAGE_UPDATE',
        'VISIT_CHECKIN',
        'VISIT_CHECKOUT',
        'KYC_UPLOAD',
        'SELF_SOURCE_LEAD',
        'NOTIFICATION_READ',
      ],
    },
    payload: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['PENDING', 'SYNCED', 'FAILED'],
      default: 'PENDING',
    },
    retryCount: { type: Number, default: 0 },
    errorMessage: { type: String },
    lastAttemptAt: { type: Date },
    syncedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('SyncQueue', syncQueueSchema);
