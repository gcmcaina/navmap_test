import type {NextConfig} from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS || false

let assetPrefix = ''
let basePath = ''

if (isGithubActions) {
  // Use 'tools' as the repository name for GitHub Pages
  const repo = 'tools'
  assetPrefix = `/${repo}/`
  basePath = `/${repo}`
}


const nextConfig: NextConfig = {
  /* config options here */
  assetPrefix: assetPrefix,
  basePath: basePath,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gcmcaina.github.io',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
