import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hybrid approach: Build static pages, use window-manager.js for routing
  // Dynamic routes are handled client-side with IPC data fetching
  // (NOT using output: 'export' to avoid generateStaticParams requirement)
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Fix asset loading in Electron
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
  basePath: '',
  distDir: 'out',
  // Ensure proper static asset handling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Include database files in server build
      config.externals = config.externals || [];
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }
    return config;
  }
};

export default nextConfig;
