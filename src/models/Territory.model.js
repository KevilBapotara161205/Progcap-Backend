import mongoose from 'mongoose';

const territorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true },
    cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', required: true },
    rm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model('Territory', territorySchema);
