import { registerAs } from '@nestjs/config';

/**
 * S3/R2 storage configuration for file uploads.
 */
export default registerAs('storage', () => ({
  endpoint: process.env.S3_ENDPOINT || '',
  bucket: process.env.S3_BUCKET || 'webtemplate',
  accessKey: process.env.S3_ACCESS_KEY || '',
  secretKey: process.env.S3_SECRET_KEY || '',
  region: process.env.S3_REGION || 'auto',
  publicUrl: process.env.S3_PUBLIC_URL || '',
}));
