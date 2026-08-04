import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ghost/ui", "@ghost/domain", "@ghost/shared"],
  reactStrictMode: true,
};

export default nextConfig;
