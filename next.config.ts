const nextConfig = {
  images: {
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