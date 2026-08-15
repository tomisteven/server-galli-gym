const cloudinary = require("../config/cloudinary");

// Sube un archivo (Buffer o path local) a Cloudinary y devuelve la URL segura.
function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "galli-gym",
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.secure_url) {
          return reject(new Error("Cloudinary no devolvió una URL válida"));
        }
        return resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

module.exports = { uploadImage };