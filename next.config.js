/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js', 'pdfjs-dist']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'canvas': 'canvas',
        'sharp': 'sharp'
      });
    }
    return config;
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  }
};

export default nextConfig;