// On Windows, process.env.USERNAME is set by the OS. Load .env with override so
// USERNAME and PASSWORD from .env take precedence over system env vars.
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env'), override: true });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.usercontent.google.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
    ],
    // Increase timeout for external image fetching
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Disable automatic trailing slash redirects to prevent redirect loops
  trailingSlash: false,
  // Optimize compiler for better performance
  compiler: {
    // Remove console logs in production, but keep error/warn/log for memory monitoring
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'log'], // Keep log for memory monitoring
    } : false,
  },
  // Enable SWC minification for faster builds (default in Next.js 13+, but explicit is good)
  swcMinify: true,
  webpack: (config, { webpack, isServer }) => {
    // Exclude VR-related modules from react-force-graph that require A-Frame
    // These modules are not needed for 2D force graphs
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource) {
            // Ignore VR-related modules that require A-Frame
            const ignoredModules = [
              '3d-force-graph-vr',
              'aframe',
              'aframe-extras',
            ];
            return ignoredModules.some(module => 
              resource.includes(module) || resource === module
            );
          },
        })
      );
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
