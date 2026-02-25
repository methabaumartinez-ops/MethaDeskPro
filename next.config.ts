import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['googleapis', 'google-auth-library', '@xenova/transformers'],
  async headers() {
    return [
      {
        source: '/ifc-viewer.html',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // Serve WASM files with correct content-type
        source: '/:file*.wasm',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
        ],
      },
    ];
  },
  webpack(config) {
    // Allow importing .wasm files as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
