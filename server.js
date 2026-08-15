require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.js");
const studentRoutes = require("./routes/students.js");
const { notFound, errorHandler } = require("./middleware/errorHandler");

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET no está definido en el entorno");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Seguridad básica de headers HTTP
app.use(helmet());

// CORS: permitir el frontend de producción y local sin credenciales explícitas
app.use(
  cors({
    origin: [
      "https://galligym.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json({ limit: "1mb" }));

// Límite de peticiones por IP (mitiga fuerza bruta y abuso)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones, intentá más tarde" },
});
app.use("/api/", apiLimiter);

// Endpoints públicos
app.get("/", (req, res) => {
  res.send("Sistema de Gestión de Gimnasio - Backend funcionando");
});
app.use("/api/auth", authRoutes);

// Rutas de estudiantes (los endpoints de administración validan su propio JWT)
app.use("/api/students", studentRoutes);

// 404 y manejo centralizado de errores
app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("No se pudo conectar a MongoDB:", err);
    process.exit(1);
  });