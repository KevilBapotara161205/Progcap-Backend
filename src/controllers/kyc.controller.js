import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { s3Client } from '../config/s3.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { KycDocument, Lead } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { AWS_BUCKET_NAME } from '../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

export const uploadDocument = async (req, res, next) => {
  try {
    const { leadId, dealerId, docType } = req.body;
    const file = req.file;

    if (!file) return error(res, 'File is required', 400);

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `kyc_${leadId}_${docType}_${uuidv4()}.${fileExtension}`;
    const uploadPath = path.join(__dirname, '../../public/uploads/kyc', fileName);
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(uploadPath), { recursive: true });
    
    // Write file to local disk
    await fs.promises.writeFile(uploadPath, file.buffer);

    const s3Key = fileName;
    const s3Url = `/uploads/kyc/${fileName}`; // Local path to be served statically

    const doc = await KycDocument.create({
      lead: leadId,
      dealer: dealerId,
      rm: req.user._id,
      docType,
      s3Key,
      s3Url,
      status: 'UPLOADED'
    });

    return success(res, doc, 'Document uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getDocumentsByLead = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const docs = await KycDocument.find({ lead: leadId });
    // Using local file storage, s3Url is already the static path, no need to sign.
    // Ensure all docs have s3Url fallback if it was missing
    docs.forEach(doc => {
        if (!doc.s3Url && doc.s3Key) {
            doc.s3Url = `/uploads/kyc/${doc.s3Key}`;
        }
    });

    return success(res, docs);
  } catch (err) {
    next(err);
  }
};

export const verifyDocument = async (req, res, next) => {
  try {
    const { status, verificationNotes } = req.body;
    const doc = await KycDocument.findById(req.params.id);
    
    if (!doc) return error(res, 'Document not found', 404);

    doc.status = status;
    doc.verificationNotes = verificationNotes;
    if (status === 'VERIFIED') {
      doc.verifiedAt = new Date();
    }
    await doc.save();

    return success(res, doc, `Document marked as ${status}`);
  } catch (err) {
    next(err);
  }
};
