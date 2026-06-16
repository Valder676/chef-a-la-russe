const path = require('path')
const { loadEnvConfig } = require('@next/env')

// .env в корне репозитория (next dev ./frontend не подхватывает его сам)
const repoRoot = path.join(__dirname, '..')
loadEnvConfig(repoRoot, process.env.NODE_ENV !== 'production', undefined, true)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  experimental: {
    externalDir: true,
    // Монорепо: standalone подтягивает чанки/CSS из корня репозитория (Next 14 — только в experimental)
    outputFileTracingRoot: path.join(__dirname, '..'),
  },
  images: {
    domains: [],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/icons/:name*.png',
        destination: '/icons/:name*.svg',
      },
    ]
  },
}

module.exports = nextConfig

