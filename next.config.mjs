/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tapcom-live.ams3.cdn.digitaloceanspaces.com",
        pathname: "/media/**"
      }
    ]
  }
};

export default nextConfig;
