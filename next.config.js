/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async headers() {
    return [
      {
        // Special route for .well-known files - public access
        source: '/.well-known/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
      {
        // Special route for manifest file - public access
        source: '/farcaster-manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
      {
        // Special route for Farcaster Preview Tool - no CSP restrictions
        source: '/preview',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/((?!preview|.well-known|farcaster-manifest).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://unpkg.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https: wss: https://farcaster.xyz https://client.farcaster.xyz https://warpcast.com https://client.warpcast.com https://wrpcd.net https://*.wrpcd.net https://privy.farcaster.xyz https://privy.warpcast.com https://auth.privy.io https://*.rpc.privy.systems https://cloudflareinsights.com https://explorer-api.walletconnect.com https://mainnet.base.org https://basescan.org; font-src 'self' data: https:; frame-ancestors https://farcaster.xyz https://warpcast.com https://client.warpcast.com *; object-src 'none'; base-uri 'self'; media-src 'self' https: blob:;",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: '/api/manifest',
      },
    ];
  },
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;