import mongoose from 'mongoose';

const kycDocumentSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    rm: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    docType: {
      type: String,
      enum: ['PAN', 'AADHAAR', 'GST', 'BANK_STATEMENT', 'BUSINESS_PHOTO', 'OTHER', 'GST_CERTIFICATE', 'PAN_CARD', 'AADHAAR_FRONT', 'AADHAAR_BACK', 'CANCELLED_CHEQUE'],
      required: true,
    },
    s3Key: { type: String },
    s3Url: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED'],
      default: 'UPLOADED',
    },
    verificationNotes: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('KycDocument', kycDocumentSchema);
