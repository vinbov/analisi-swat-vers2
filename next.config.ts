
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [], // Add your specific origins if needed, or leave empty for same-origin
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Added configuration for Facebook CDN images
      {
        protocol: 'https',
        hostname: '*.fbcdn.net', // Covers scontent.fbcdn.net, external.fbcdn.net and their subdomains like scontent-mia3-2.xx.fbcdn.net
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent-*.xx.fbcdn.net', // Specific pattern for scontent-location.xx.fbcdn.net if needed, though *.fbcdn.net should cover it
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com', // For profile pictures or other assets from Graph API
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
