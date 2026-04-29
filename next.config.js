/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel serverless configuration
  output: 'standalone',
  // Disable strict mode for production
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig
