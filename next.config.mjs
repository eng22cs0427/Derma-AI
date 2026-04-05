/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'thumbs.dreamstime.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.1mg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'onemg.gumlet.io', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
      // Free cloud storage (Cloudinary — replaces AWS S3)
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      // Clerk user avatars
      { protocol: 'https', hostname: 'img.clerk.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.clerk.dev', pathname: '/**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
