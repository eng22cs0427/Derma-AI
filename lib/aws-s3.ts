/**
 * AWS S3 shim — re-exports from Cloudinary
 * Preserves all existing import paths: import { uploadFile } from '@/lib/aws-s3'
 */
export {
  uploadFile,
  uploadAvatar,
  uploadAnalysisImage,
  uploadReport,
  deleteFile,
  getSignedDownloadUrl,
} from './cloudinary'
