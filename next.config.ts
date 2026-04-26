/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // הגדרת אישור לטעינת תמונות מ-Supabase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ehndiifaaobawrnlcqld.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;