const { HttpError } = require("./errorHandler");

// Solo dígitos. Valida DNI de 7 u 8 dígitos.
function sanitizeDni(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "").slice(0, 8);
}

function parseDniParam(req, res, next) {
  const dni = sanitizeDni(req.params.dni);
  if (!dni) {
    return next(new HttpError(400, "DNI inválido"));
  }
  req.params.dni = dni;
  return next();
}

function validateAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

module.exports = { sanitizeDni, parseDniParam, validateAmount };