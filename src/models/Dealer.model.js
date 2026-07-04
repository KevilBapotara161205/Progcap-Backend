import mongoose from 'mongoose';

const dealerSchema = new mongoose.Schema(
  {
    anchor: { type: mongoose.Schema.Types.ObjectId, ref: 'Anchor', required: true },
    businessName: { type: String, required: true, trim: true },
    ownerName: { type: String, trim: true },
    businessType: {
      type: String,
      enum: ['RETAILER', 'DISTRIBUTOR', 'WHOLESALER', 'OTHER'],
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    phone: { type: String },
    email: { type: String, lowercase: true },
    cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster' },
    territory: { type: mongoose.Schema.Types.ObjectId, ref: 'Territory' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

dealerSchema.index({ location: '2dsphere' });

export default mongoose.model('Dealer', dealerSchema);
