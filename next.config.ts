/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // הסרנו את eslint ואת experimental כדי למנוע אזהרות
};

module.exports = nextConfig;