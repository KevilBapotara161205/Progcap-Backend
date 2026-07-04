import mongoose from 'mongoose';

const nbaConfigSchema = new mongoose.Schema(
  {
    weights: {
      dealValue: { type: Number, default: 15 },
      sanctionExpiryUrgency: { type: Number, default: 30 },
      dpdRisk: { type: Number, default: 20 },
      geoProximity: { type: Number, default: 10 },
      stageProgression: { type: Number, default: 25 },
    },
    stuckCaseThresholdDays: { type: Number, default: 3 },
    sanctionExpiryAlertDays: { type: [Number], default: [7, 3] },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('NbaConfig', nbaConfigSchema);
