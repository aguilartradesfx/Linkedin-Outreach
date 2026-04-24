import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['handlebars', '@upstash/redis'],
}

export default nextConfig
