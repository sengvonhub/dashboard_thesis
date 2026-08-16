const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dltajsfwd/**", 
      },
    ],
  },
};

module.exports = nextConfig;