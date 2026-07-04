import mongoose from 'mongoose';

const clusterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true },
    region: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model('Cluster', clusterSchema);
