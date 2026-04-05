/**
 * Cloudinary File Storage
 * Replaces: lib/aws-s3.ts (AWS S3)
 * Free tier: 25GB storage, 25GB bandwidth/month
 * Same function signatures as aws-s3.ts — zero breaking changes
 */
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

/** Upload any file buffer to Cloudinary. Returns permanent CDN URL. */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const isImage = contentType.startsWith('image/')
    const resourceType = isImage ? 'image' : 'raw'
    // Strip file extension for public_id (Cloudinary adds it back)
    const publicId = key.replace(/\.[^/.]+$/, '')

    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`))
        resolve(result!.secure_url)
      }
    )
    stream.end(buffer)
  })
}

/** Upload user avatar. Returns CDN URL. */
export async function uploadAvatar(
  userId: string,
  file: Buffer,
  mimeType: string
): Promise<string> {
  const extension = mimeType.split('/')[1] || 'jpg'
  const key = `avatars/${userId}.${extension}`
  return uploadFile(file, key, mimeType)
}

/** Upload skin analysis image. Returns { url, key }. */
export async function uploadAnalysisImage(
  userId: string,
  file: Buffer,
  mimeType: string
): Promise<{ url: string; key: string }> {
  const timestamp = Date.now()
  const extension = mimeType.split('/')[1] || 'jpg'
  const key = `analysis-images/${userId}/${timestamp}.${extension}`
  const url = await uploadFile(file, key, mimeType)
  return { url, key }
}

/** Upload PDF medical report. Returns CDN URL. */
export async function uploadReport(
  userId: string,
  file: Buffer,
  filename: string
): Promise<string> {
  const key = `reports/${userId}/${filename}`
  return uploadFile(file, key, 'application/pdf')
}

/** Delete a file by its key path. */
export async function deleteFile(key: string): Promise<void> {
  const publicId = key.replace(/\.[^/.]+$/, '')
  await cloudinary.uploader.destroy(publicId)
}

/** Get a signed URL for private files (or direct URL for public). */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const publicId = key.replace(/\.[^/.]+$/, '')
  return cloudinary.url(publicId, {
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    secure: true,
  })
}
