const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { HttpError } = require("../middleware/errorHandler");

// POST /api/auth/login
// Body: { username, password }
router.post("/login", async (req, res) => {
  const username = (req.body.username || "").toString().trim();
  const password = (req.body.password || "").toString();

  if (!username || !password) {
    throw new HttpError(400, "Ingresá usuario y contraseña");
  }

  const admin = await Admin.findOne({ username });
  if (!admin || !(await admin.comparePassword(password))) {
    throw new HttpError(401, "Credenciales inválidas");
  }

  const token = jwt.sign(
    { id: admin._id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );

  return res.json({
    success: true,
    token,
    admin: { id: admin._id, username: admin.username },
  });
});

module.exports = router;