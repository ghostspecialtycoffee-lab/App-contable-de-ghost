import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: [
    "@ghost/ui",
    "@ghost/domain",
    "@ghost/shared",
    "@ghost/infrastructure",
  ],
  reactStrictMode: true,
};

export default nextConfig;
