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
  // eslint and typescript checks are ENABLED — do not suppress them.
  // If the build fails due to type errors, fix the errors instead of
  // re-adding ignoreBuildErrors / ignoreDuringBuilds here.
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
      // INTENTIONAL: permanent server/client boundary guards — do not remove.
      //
      // 1. db.ts → db.client.ts: prevents ANY DB service code from reaching
      //    the browser bundle. DatabaseService on the client throws immediately.
      //
      // 2. qdrant/client → false: Qdrant is semantic-search only (server-side).
      //    Blocking it here ensures it can never be bundled for the browser.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
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
