/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Configure images if needed
  images: {
    domains: ['localhost'],
  },
  
  // Configure webpack if needed
  webpack: (config) => {
    return config;
  },
  
  // Configure async redirects if needed
  async redirects() {
    return [];
  },
  
  // Configure rewrites if needed
  async rewrites() {
    return [];
  },
  
  // Configure headers if needed
  async headers() {
    return [];
  },
};

module.exports = nextConfig;
