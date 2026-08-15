const jwt = require("jsonwebtoken");

// Verifica el token JWT en el header Authorization: Bearer <token>.
function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "No autorizado: faltan credenciales" });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "No autorizado: sesión inválida o expirada" });
  }
}

module.exports = { authRequired };