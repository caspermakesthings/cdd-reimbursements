/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib']
  },
  webpack: (config, { isServer }) => {
    // Fix for zod module resolution issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  // Configure for larger file uploads
  async headers() {
    return [
      {
        source: '/api/reimburse/batch',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig