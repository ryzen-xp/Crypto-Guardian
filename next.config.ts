import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Strict mode for React
  reactStrictMode: true,

  // TypeScript — fail build on type errors
  typescript: {
    ignoreBuildErrors: false,
  },

  // Image domains (add as needed)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
