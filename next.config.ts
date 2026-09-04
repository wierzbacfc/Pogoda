import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? '/Pogoda' : '',
  assetPrefix: isGitHubPages ? '/Pogoda/' : undefined,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  allowedDevOrigins: ['192.168.0.181', '192.168.0.181:3333', 'localhost', 'localhost:3333'],
};

export default nextConfig;

