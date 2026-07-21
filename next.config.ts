import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ARM64 TypeScript checker workaround
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow larger body for image uploads
  serverExternalPackages: ['openai', '@anthropic-ai/sdk'],
};

export default nextConfig;
