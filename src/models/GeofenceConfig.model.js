import mongoose from 'mongoose';

const geofenceConfigSchema = new mongoose.Schema(
  {
    defaultRadiusMeters: { type: Number, default: 100 },
    overrides: [
      {
        dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer' },
        radiusMeters: { type: Number },
      },
    ],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('GeofenceConfig', geofenceConfigSchema);
