/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 支持 ES modules
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig

