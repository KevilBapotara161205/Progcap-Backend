import { S3Client } from '@aws-sdk/client-s3';
import { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME } from './env.js';

let s3Client = null;

if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
  });
} else {
  console.warn('S3 Client not initialized: AWS credentials are missing.');
}

export { s3Client, AWS_BUCKET_NAME as BUCKET_NAME };
