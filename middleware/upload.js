const multer = require("multer");

// Sube la imagen a memoria (evita archivos temporales en disco).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Solo se permiten archivos de imagen"));
  },
});

// Middleware que captura el campo "image" si viene.
const uploadImageField = upload.single("image");

module.exports = { uploadImageField };