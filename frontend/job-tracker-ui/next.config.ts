import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://<YOUR_API_ID>.execute-api.<REGION>.amazonaws.com/dev/:path*',
      },
    ];
  },
};

export default nextConfig;
