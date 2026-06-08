/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["cheerio", "rss-parser"],
  },
};
export default nextConfig;
