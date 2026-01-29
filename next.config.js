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
        hostname: '**',
      },
    ],
    // Increase timeout for external image fetching
    minimumCacheTTL: 60,
    // Add device sizes for better optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    // Limit client-side router cache retention to reduce memory growth
    staleTimes: {
      dynamic: 30,   // 30s for on-demand navigations (default 0 in newer Next)
      static: 60,    // 1 min for prefetched/static (default 5 min)
    },
  },
  // Disable automatic trailing slash redirects to prevent redirect loops
  trailingSlash: false,
  // Optimize compiler for better performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Enable SWC minification for faster builds
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
}

module.exports = nextConfig
