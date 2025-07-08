/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "res.cloudinary.com", // ✅ Cloudinary
      "utfs.io",
      "xqtnsjfw0c.ufs.sh",
      "example.com",
      "mi-cdn.com",
    ],
  },
};

export default nextConfig;
