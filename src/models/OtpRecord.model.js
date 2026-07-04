import mongoose from 'mongoose';

const otpRecordSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

otpRecordSchema.index({ phone: 1 });

export default mongoose.model('OtpRecord', otpRecordSchema);
