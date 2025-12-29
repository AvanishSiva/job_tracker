import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://ftolhfdqyl.execute-api.eu-west-1.amazonaws.com/dev/:path*',
      },
    ];
  },
};

export default nextConfig;
