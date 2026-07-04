import mongoose from 'mongoose';

const anchorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true },
    industry: { type: String },
    contact: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    clusters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cluster' }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model('Anchor', anchorSchema);
