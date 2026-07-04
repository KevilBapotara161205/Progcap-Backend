import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER', 'RM'],
      default: 'RM',
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    territory: { type: mongoose.Schema.Types.ObjectId, ref: 'Territory' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fcmToken: { type: String },
    appVersion: { type: String },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
