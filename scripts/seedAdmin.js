// Crea o actualiza el usuario administrador desde variables de entorno.
// Uso: npm run seed:admin
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const dns = require("node:dns");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

// Resolvers públicos por si el DNS del ISP no resuelve los SRV de Atlas.
try {
  dns.setServers(
    (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1,9.9.9.9").split(",").map((s) => s.trim())
  );
} catch {}
const setupDns = require("./setupDns");

setupDns();

async function run() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("Falta ADMIN_USERNAME / ADMIN_PASSWORD en .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.findOneAndUpdate(
    { username },
    { passwordHash },
    { upsert: true, new: true }
  );

  console.log(`Admin "${username}" listo`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});