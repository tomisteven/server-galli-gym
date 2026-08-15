const mongoose = require("mongoose");
const dns = require("node:dns");

// Algunas redes/ISP no resuelven bien los registros SRV de MongoDB Atlas
// (mongodb+srv://). Usamos resolvers públicos para evitarlo.
// Se puede sobrescribir con la variable DNS_SERVERS (separados por coma).
const DNS_SERVERS = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1,9.9.9.9")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (DNS_SERVERS.length > 0) {
  try {
    dns.setServers(DNS_SERVERS);
    console.log(`DNS resolución configurada: ${DNS_SERVERS.join(", ")}`);
  } catch (err) {
    console.warn("No se pudieron setear los DNS:", err.message);
  }
}

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI no está definido en el entorno");
  }

  mongoose.connection.on("error", (err) => {
    console.error("Error de conexión con MongoDB:", err.message);
  });

  try {
    await mongoose.connect(uri);
    console.log("MongoDB conectado");
    return mongoose.connection;
  } catch (err) {
    console.error(
      `No se pudo conectar a MongoDB. Verificá MONGO_URI, red y DNS_SERVERS.`
    );
    throw err;
  }
}

module.exports = connectDB;