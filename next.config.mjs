/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Força o Turbopack a recompilar o cache apos remocao do middleware.ts
  experimental: {
    turbo: {},
  },
}

export default nextConfig
