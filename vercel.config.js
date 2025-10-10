// Vercel Build Configuration
module.exports = {
  // Build settings
  framework: null,
  buildCommand: "npm run build",
  outputDirectory: ".",
  installCommand: "npm install",
  
  // Functions configuration
  functions: {
    "server.js": {
      runtime: "nodejs18.x",
      maxDuration: 30
    }
  },
  
  // Headers for better performance
  headers: [
    {
      source: "/css/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      source: "/js/(.*)",
      headers: [
        {
          key: "Cache-Control", 
          value: "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
};