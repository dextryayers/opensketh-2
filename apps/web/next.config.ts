import type { NextConfig } from 'next';

const isStaticBuild = process.env.BUILD_MODE === 'static';

const nextConfig: NextConfig = {
  output: isStaticBuild ? 'export' : undefined,
  // PENTING: Wajib true untuk cPanel agar folder 'room' terbaca sebagai index.html
  trailingSlash: true,
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (isStaticBuild) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
    ];
  },
} as any;

export default nextConfig;