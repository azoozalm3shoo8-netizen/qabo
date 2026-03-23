import type { NextConfig } from 'next'

function supabaseImageHost(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!u) return '127.0.0.1'
  try {
    return new URL(u).hostname
  } catch {
    return '127.0.0.1'
  }
}

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseImageHost(),
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
