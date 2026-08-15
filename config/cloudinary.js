const cloudinary = require("cloudinary").v2;

// Configuración única de Cloudinary (se ejecuta una sola vez al importar).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET_CLOUDINARY,
  secure: true,
});

module.exports = cloudinary;