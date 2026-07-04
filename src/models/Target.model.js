import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    targetType: {
      type: String,
      enum: ['RM', 'CLUSTER', 'REGION'],
    },
    disbursementTarget: { type: Number, default: 0 },
    isRampUp: { type: Boolean, default: false },
    rampUpMonth: { type: Number, min: 1, max: 3 },
  },
  { timestamps: true }
);

targetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Target', targetSchema);
