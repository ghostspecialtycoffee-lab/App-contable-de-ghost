import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ghost/ui",
    "@ghost/domain",
    "@ghost/shared",
    "@ghost/infrastructure",
  ],
  reactStrictMode: true,
};

export default nextConfig;
