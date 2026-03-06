import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // output: "standalone" only for production Docker builds.
  // In dev mode this generates incompatible cache artifacts that cause
  // vendor-chunk 404s and ERR_CONNECTION_REFUSED after hot reloads.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' ? { output: 'standalone' } : {}),
  experimental: {
    webpackBuildWorker: false,
  },
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
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      // For client-side bundles, map the database service to the dummy client proxy
      // to prevent "server-only" or qdrant components from breaking the build.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');

      // Use NormalModuleReplacementPlugin to intercept TS aliases BEFORE resolution
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^@\/lib\/services\/db$/,
          path.resolve(__dirname, 'src/lib/services/db.client.ts')
        ),
        new webpack.NormalModuleReplacementPlugin(
          /^@\/lib\/qdrant\/client$/,
          false
        )
      );
    }

    // Allow importing .wasm files as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
