import type { NextConfig } from 'next';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  /* config options here */
};

export default nextConfig;
