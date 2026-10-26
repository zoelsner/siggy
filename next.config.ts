import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  images: {
    // Siggy uses ordinary img tags for its Blob-hosted signature assets.
    // Keep the unused optimizer endpoint disabled and deny remote sources.
    unoptimized: true,
    remotePatterns: []
  }
};

export default nextConfig;
