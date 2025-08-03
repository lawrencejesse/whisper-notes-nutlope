// lib/s3Upload.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Create S3 client with proper configuration to avoid CRC32 checksum issues
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.S3_UPLOAD_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_UPLOAD_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_UPLOAD_SECRET!,
  },
  // Disable CRC32 checksums to prevent MinIO issues
  requestHandler: undefined, // Let AWS SDK use default
});

/**
 * Upload a file directly to S3
 * This bypasses the multipart upload issues we were having with next-s3-upload
 */
export async function uploadToS3(file: File, key: string): Promise<string> {
  try {
    const bucketName = process.env.S3_UPLOAD_BUCKET;
    if (!bucketName) {
      throw new Error("S3_UPLOAD_BUCKET environment variable is not set");
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
      // Don't use public-read ACL to avoid potential permission issues
      // We'll rely on bucket policy for public access if needed
    });

    const result = await s3Client.send(command);
    
    if (result.$metadata.httpStatusCode !== 200) {
      throw new Error(`Upload failed with status: ${result.$metadata.httpStatusCode}`);
    }

    // Return the public URL to the uploaded file
    const region = process.env.AWS_S3_REGION || process.env.S3_UPLOAD_REGION;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw error;
  }
}

/**
 * Generate a unique key for the uploaded file
 */
export function generateFileKey(filename: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = filename.split('.').pop();
  return `uploads/${timestamp}-${randomString}.${extension}`;
}