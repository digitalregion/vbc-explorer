import type { NextConfig } from 'next';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    PORT: process.env.PORT,
    WEB3_PROVIDER_URL: process.env.WEB3_PROVIDER_URL,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sugar.digitalregion.jp',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      }
    ],
  },
  /* config options here */
};

export default nextConfig;
