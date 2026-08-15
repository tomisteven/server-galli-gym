// Importa alumnos desde un export de MongoDB (formato extended JSON).
//
// Uso: npm run import:students -- path/to/export.json
//
// - Conserva _id y fechas originales (asistencias, pagos, vencimientos).
// - Si el DNI ya existe en la base, se omite (no pisa datos existentes).
// - Reporta cuántos se insertaron y cuántos se omitieron.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const dns = require("node:dns");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Student = require("../models/Student");

// Resolvers públicos por si el DNS del ISP no resuelve los SRV de Atlas.
try {
  dns.setServers(
    (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1,9.9.9.9").split(",").map((s) => s.trim())
  );
} catch {}
const setupDns = require("./setupDns");

setupDns();

// Convierte { $oid: "..." } -> ObjectId
function parseOid(value) {
  if (value && typeof value === "object" && value.$oid) {
    return new mongoose.Types.ObjectId(value.$oid);
  }
  return value;
}

// Convierte { $date: "..." } -> Date
function parseDate(value) {
  if (value && typeof value === "object" && value.$date) {
    return new Date(value.$date);
  }
  return value;
}

// Convierte $oid/$date de forma recursiva a todos los niveles.
function deepConvert(raw) {
  if (Array.isArray(raw)) return raw.map(deepConvert);
  if (raw && typeof raw === "object") {
    if (raw.$oid !== undefined) return parseOid(raw);
    if (raw.$date !== undefined) return parseDate(raw);
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[k] = deepConvert(v);
    return out;
  }
  return raw;
}

async function run() {
  const arg = process.argv[2] || "../client-galli-gym/test.students_21.01.26.json";
  const filePath = path.resolve(__dirname, "..", "..", "client-galli-gym", path.basename(arg));
  const fallback = path.resolve(arg);

  const source = fs.existsSync(filePath) ? filePath : fallback;
  const raw = JSON.parse(fs.readFileSync(source, "utf8"));
  if (!Array.isArray(raw)) {
    console.error("El archivo debe contener un array de alumnos");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await Student.find({}, "dni").lean();
  const existingDnis = new Set(existing.map((s) => s.dni));

  let inserted = 0;
  let skipped = 0;

  for (const record of raw) {
    const dni = String(record.dni || "").trim();
    if (!dni) {
      skipped++;
      continue;
    }
    if (existingDnis.has(dni)) {
      skipped++;
      continue;
    }

    const doc = deepConvert(record);
    delete doc.__v;
    const student = new Student(doc);
    await student.save();
    existingDnis.add(dni);
    inserted++;
  }

  console.log(`Total archivo: ${raw.length} | Insertados: ${inserted} | Omitidos (ya existían o inválidos): ${skipped}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Error al importar:", err);
  process.exit(1);
});