import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    proxyClientMaxBodySize: "64mb",
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;
