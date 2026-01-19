/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure @google/generative-ai is not externalized for serverless functions
  // This tells Next.js to bundle it instead of treating it as an external dependency
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig

