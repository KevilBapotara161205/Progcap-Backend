import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    anchor: { type: mongoose.Schema.Types.ObjectId, ref: 'Anchor', required: true },
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    stage: {
      type: String,
      enum: [
        'ASSIGNED',
        'IN_PROGRESS',
        'CREDIT_ASSESSMENT',
        'KYC_SUBMITTED',
        'SANCTIONED',
        'DISBURSED',
        'CLOSED_WON',
        'CLOSED_LOST',
      ],
      default: 'ASSIGNED',
    },
    expectedValue: { type: Number, default: 0 },
    urgencyFlag: { type: Boolean, default: false },
    isStuck: { type: Boolean, default: false },
    stuckSince: { type: Date },
    sanctionExpiryDate: { type: Date },
    plannedVisitDate: { type: Date },
    dpnRiskFlag: { type: Boolean, default: false },
    npaFlag: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: Date.now },
    selfSourced: { type: Boolean, default: false },
    selfSourcedStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
    },
    assignmentHistory: [
      {
        rm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedAt: { type: Date },
        reason: { type: String },
      },
    ],
    notes: { type: String },
    nbaStatus: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
    nbaNotes: { type: String },
    kycCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

leadSchema.index({ assignedTo: 1, stage: 1 });
leadSchema.index({ isStuck: 1 });
leadSchema.index({ sanctionExpiryDate: 1 });

export default mongoose.model('Lead', leadSchema);
