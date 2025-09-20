import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  typedRoutes: true,
};

export default nextConfig;
