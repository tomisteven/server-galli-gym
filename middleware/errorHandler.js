// Centraliza el manejo de errores. Todos los middlewares/rutas pueden
// hacer `throw` y este handler responde el JSON correspondiente.

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 404 para rutas no encontradas
function notFound(req, res) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || "Error interno del servidor";

  // Errores de validación de Mongoose
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // DNI duplicado
  if (err.code === 11000 && err.keyPattern && err.keyPattern.dni) {
    status = 409;
    message = "Ya existe un alumno con ese DNI";
  }

  if (status >= 500) {
    console.error("[ERROR]", err);
  }

  res.status(status).json({ error: message });
}

module.exports = { HttpError, notFound, errorHandler };