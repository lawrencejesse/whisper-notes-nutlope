import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Updated for Next.js 15+
  serverExternalPackages: ["sharp"],
  // Configure S3 upload settings for large files
  env: {
    S3_UPLOAD_MAXSIZE: "1073741824", // 1GB in bytes
    // Set very high multipart threshold to force single-part uploads for most files
    // This avoids the CRC32 checksum issue with next-s3-upload v0.3.4
    S3_UPLOAD_MULTIPART_THRESHOLD: "268435456", // 256MB - much higher than your 16MB file
  },
};

export default nextConfig;
