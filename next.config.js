/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Prevent webpack from trying to bundle Capacitor native plugins
    // They're only used at runtime on native platforms via dynamic import
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'firebase/messaging': false,
      'firebase/app': false,
    };
    return config;
  },
};

module.exports = nextConfig;
