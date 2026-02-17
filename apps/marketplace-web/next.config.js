/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable both App Router and Pages Router
  experimental: {},
  // Image domains
  images: {
    domains: ['via.placeholder.com', 'loremflickr.com', 'picsum.photos'],
  },
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    NEXT_PUBLIC_INTERCOM_APP_ID: process.env.NEXT_PUBLIC_INTERCOM_APP_ID,
  },
};

module.exports = nextConfig;
