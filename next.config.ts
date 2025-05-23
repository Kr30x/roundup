import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',    // For Google profile pictures
      'firebasestorage.googleapis.com' // For Firebase Storage images
    ],
    unoptimized: process.env.NODE_ENV === 'development' // Only optimize in production
  },
  typescript: {
    ignoreBuildErrors: false, // Ensure type checking during build
  },
  eslint: {
    ignoreDuringBuilds: false, // Ensure linting during build
  },
  poweredByHeader: false, // Remove X-Powered-By header for security
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' // Remove console.logs in production
  }
};

export default nextConfig;
