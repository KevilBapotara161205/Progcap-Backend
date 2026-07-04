import mongoose from 'mongoose';

const dailyBeatPlanSchema = new mongoose.Schema(
  {
    rm: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    leadOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
  },
  { timestamps: true }
);

dailyBeatPlanSchema.index({ rm: 1, date: 1 }, { unique: true });

export default mongoose.model('DailyBeatPlan', dailyBeatPlanSchema);
