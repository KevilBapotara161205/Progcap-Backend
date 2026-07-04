import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    rm: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    checkInLocation: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
    },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
    visitDuration: { type: Number },
    geofenceStatus: {
      type: String,
      enum: ['VALID', 'VIOLATED', 'BYPASSED'],
    },
    notes: { type: String },
    photos: [{ type: String }],
    syncedAt: { type: Date },
  },
  { timestamps: true }
);

visitSchema.index({ checkInLocation: '2dsphere' });

export default mongoose.model('Visit', visitSchema);
