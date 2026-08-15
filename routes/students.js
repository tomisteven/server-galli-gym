const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const { authRequired } = require("../middleware/auth");
const { uploadImageField } = require("../middleware/upload");
const { uploadImage } = require("../utils/cloudinaryUpload");
const { HttpError } = require("../middleware/errorHandler");
const {
  parseDniParam,
  validateAmount,
  sanitizeDni,
} = require("../middleware/validate");
const {
  atNoonUTC,
  dayRangeInArgentina,
  addMonthKeepingDay,
} = require("../utils/dateUtils");

// Campos que se pueden modificar desde el formulario.
const ALLOWED_FIELDS = [
  "dni",
  "name",
  "lastName",
  "email",
  "phone",
  "image",
  "paymentHistory",
  "asistencias",
  "birthDate",
  "activo",
  "planType",
  "medicamento",
  "patologias",
  "joinDate",
  "paymentDueDate",
];

// Las asistencias del mes pueden ser enormes; no las traemos en la lista.
const LIST_PROJECTION = {
  dni: 1,
  name: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  image: 1,
  planType: 1,
  joinDate: 1,
  paymentDueDate: 1,
  activo: 1,
};

function normalizeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Fecha inválida");
  }
  return atNoonUTC(date);
}

// Convierte el body multipart (todo strings) a un objeto de actualización limpio.
function buildUpdatePayload(body) {
  const payload = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] === undefined) continue;

    if (key === "paymentHistory" || key === "asistencias") {
      if (body[key] === "") continue;
      if (Array.isArray(body[key])) {
        payload[key] = body[key];
      } else {
        try {
          payload[key] = JSON.parse(body[key]);
        } catch {
          // Se ignora el campo si el formato es inválido
        }
      }
    } else if (key === "activo") {
      payload[key] = body[key] === true || body[key] === "true";
    } else if (key === "joinDate" || key === "paymentDueDate") {
      payload[key] = normalizeDate(body[key]);
    } else {
      payload[key] = body[key];
    }
  }
  return payload;
}

// ---- Público: sin autenticación -----------------------------------------

// Registra ingreso (kiosko). 402 si la cuota está vencida.
// No admite doble ingreso en el mismo día.
router.get("/ingresa/:dni", parseDniParam, async (req, res) => {
  const { dni } = req.params;

  const student = await Student.findOne({ dni });
  if (!student) {
    throw new HttpError(404, "Estudiante no encontrado");
  }

  const now = new Date();
  if (student.paymentDueDate && student.paymentDueDate < now) {
    return res
      .status(402)
      .json({ error: "No se puede registrar ingreso: cuota vencida", student });
  }

  const { start, end } = dayRangeInArgentina(now);
  const result = await Student.updateOne(
    { dni, asistencias: { $not: { $elemMatch: { $gte: start, $lte: end } } } },
    { $push: { asistencias: now } }
  );

  if (result.modifiedCount === 0) {
    const current = await Student.findOne({ dni });
    return res
      .status(400)
      .json({ student: current, error: "Ya se registró un ingreso hoy" });
  }

  const updated = await Student.findOne({ dni });
  return res.json(updated);
});

// Fuerza ingreso ignorando validaciones de cuota y duplicado.
router.post("/forzar-ingreso/:dni", parseDniParam, async (req, res) => {
  const { dni } = req.params;
  const student = await Student.findOne({ dni });
  if (!student) {
    throw new HttpError(404, "Estudiante no encontrado");
  }

  student.asistencias.push(new Date());
  await student.save();

  return res.json({
    success: true,
    message: "Ingreso forzado registrado correctamente",
    student,
  });
});

// ---- Administración: requieren JWT --------------------------------------

// Listado de alumnos (payload liviano). Soporta ?q= para buscar por texto.
router.get("/", authRequired, async (req, res) => {
  const query = {};
  const q = (req.query.q || "").toString().trim();
  const status = (req.query.status || "").toString().trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 5), 100);
  const skip = (page - 1) * limit;
  const now = new Date();

  if (q) {
    query.$or = [
      { dni: new RegExp(q, "i") },
      { name: new RegExp(q, "i") },
      { lastName: new RegExp(q, "i") },
    ];
  }

  if (status === "vencidos") {
    query.paymentDueDate = { $lt: now };
  } else if (status === "aldia") {
    query.paymentDueDate = { $gte: now };
  }

  const [total, totalGym, vencidos, alDia, students] = await Promise.all([
    Student.countDocuments(query),
    Student.countDocuments({}),
    Student.countDocuments({ paymentDueDate: { $lt: now } }),
    Student.countDocuments({ paymentDueDate: { $gte: now } }),
    Student.find(query, LIST_PROJECTION)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return res.json({
    items: students,
    total,
    summary: {
      total: totalGym,
      vencidos,
      alDia,
    },
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  });
});

// Detalle de un alumno (incluye asistencias e historial completo).
router.get("/alumno/:dni", authRequired, parseDniParam, async (req, res) => {
  const student = await Student.findOne({ dni: req.params.dni }).lean();
  if (!student) {
    throw new HttpError(404, "Estudiante no encontrado");
  }
  return res.json(student);
});

// Crear alumno.
router.post("/nuevo", authRequired, uploadImageField, async (req, res) => {
  const dni = sanitizeDni(req.body.dni);
  if (!dni || dni.length < 7) {
    throw new HttpError(400, "DNI inválido");
  }

  const existing = await Student.findOne({ dni });
  if (existing) {
    throw new HttpError(409, "El alumno ya existe");
  }

  const payload = buildUpdatePayload(req.body);
  payload.dni = dni;

  if (req.file) {
    payload.image = await uploadImage(req.file.buffer);
  }

  const newStudent = new Student(payload);

  // Si no llega vencimiento, hoy + 30 días (mediodía UTC, día calendario UTC).
  if (!newStudent.paymentDueDate) {
    const now = new Date();
    newStudent.paymentDueDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 30,
        12,
        0,
        0
      )
    );
  }

  await newStudent.save();
  return res.status(201).json({
    success: true,
    message: "Alumno creado exitosamente",
    student: newStudent,
  });
});

// Actualizar alumno.
router.put(
  "/actualizar/:dni",
  authRequired,
  parseDniParam,
  uploadImageField,
  async (req, res) => {
    const newDni = sanitizeDni(req.body.dni);
    const payload = buildUpdatePayload({ ...req.body });
    if (newDni) {
      payload.dni = newDni;
    } else {
      delete payload.dni;
    }

    const updated = await Student.findOneAndUpdate(
      { dni: req.params.dni },
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new HttpError(404, "Estudiante no encontrado");
    }

    // Si viene una imagen nueva hay que subirla después del update.
    if (req.file) {
      const image = await uploadImage(req.file.buffer);
      updated.image = image;
      await updated.save();
    }

    return res.json({
      success: true,
      message: "Alumno actualizado exitosamente",
      student: updated,
    });
  }
);

// Agregar pago al historial SIN modificar el vencimiento.
router.post(
  "/agregar-pago/historial/:dni",
  authRequired,
  parseDniParam,
  async (req, res) => {
    const amount = validateAmount(req.body.amount);
    if (amount === null) {
      throw new HttpError(400, "Monto inválido");
    }

    const student = await Student.findOne({ dni: req.params.dni });
    if (!student) {
      throw new HttpError(404, "Estudiante no encontrado");
    }

    student.paymentHistory = student.paymentHistory.filter(
      (e) => e && typeof e === "object" && e.amount !== ""
    );
    student.paymentHistory.push({ paymentDate: new Date(), amount });
    await student.save();

    return res.json({
      success: true,
      message: "Pago agregado exitosamente",
      student,
    });
  }
);

// Agregar pago y renovar el vencimiento (suma 1 mes).
router.post(
  "/agregar-pago/:dni",
  authRequired,
  parseDniParam,
  async (req, res) => {
    const amount = validateAmount(req.body.amount);
    if (amount === null) {
      throw new HttpError(400, "Monto inválido");
    }

    const student = await Student.findOne({ dni: req.params.dni });
    if (!student) {
      throw new HttpError(404, "Estudiante no encontrado");
    }

    student.paymentHistory = student.paymentHistory.filter(
      (e) => e && typeof e === "object" && e.amount !== ""
    );
    student.paymentHistory.push({ paymentDate: new Date(), amount });

    const base = student.paymentDueDate || student.joinDate || new Date();
    student.paymentDueDate = addMonthKeepingDay(base);

    await student.save();

    return res.json({
      success: true,
      message: "Pago agregado exitosamente",
      student,
      fechaIngreso: student.joinDate,
      fechaPago: new Date(),
      nuevoVencimiento: student.paymentDueDate,
    });
  }
);

// Baja (eliminación física) de un alumno.
router.delete("/baja/:dni", authRequired, parseDniParam, async (req, res) => {
  const deleted = await Student.findOneAndDelete({ dni: req.params.dni });
  if (!deleted) {
    throw new HttpError(404, "Estudiante no encontrado");
  }
  return res.json({
    success: true,
    message: `Estudiante ${deleted.name} ${deleted.lastName} dado de baja`,
  });
});

// Elimina una asistencia puntual por fecha exacta.
router.delete("/asistencias/:dni", authRequired, parseDniParam, async (req, res) => {
  const fecha = (req.query.fecha || "").toString();
  const asistencia = new Date(fecha);

  if (!fecha || Number.isNaN(asistencia.getTime())) {
    throw new HttpError(400, "Fecha de asistencia inválida");
  }

  const student = await Student.findOne({ dni: req.params.dni });
  if (!student) {
    throw new HttpError(404, "Estudiante no encontrado");
  }

  const before = student.asistencias.length;
  const targetTime = asistencia.getTime();
  student.asistencias = student.asistencias.filter(
    (item) => new Date(item).getTime() !== targetTime
  );

  if (student.asistencias.length === before) {
    throw new HttpError(404, "No se encontró la asistencia para eliminar");
  }

  await student.save();

  return res.json({
    success: true,
    message: "Asistencia eliminada correctamente",
    student,
  });
});

// Asistencias por día (YYYY-MM-DD).
router.get(
  "/asistencias-por-dia/:fecha",
  authRequired,
  async (req, res) => {
    const { fecha } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new HttpError(400, "Formato de fecha inválido. Usar YYYY-MM-DD");
    }

    // Convertir "YYYY-MM-DD" al rango correcto del día argentino.
    const [y, m, d] = fecha.split("-").map(Number);
    const { start, end } = dayRangeInArgentina(
      new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    );

    const students = await Student.find(
      { asistencias: { $elemMatch: { $gte: start, $lte: end } } },
      "dni name lastName email asistencias"
    ).lean();

    const result = students
      .map((s) => {
        const matching = (s.asistencias || []).filter((a) => a >= start && a <= end);
        return {
          dni: s.dni,
          name: s.name,
          lastName: s.lastName,
          email: s.email,
          asistenciasEseDia: matching.map((d) => d.toISOString()),
        };
      })
      .sort((a, b) => {
        const lastA = new Date(a.asistenciasEseDia[a.asistenciasEseDia.length - 1]);
        const lastB = new Date(b.asistenciasEseDia[b.asistenciasEseDia.length - 1]);
        return lastB - lastA;
      });

    return res.json({ fecha, cantidad: result.length, alumnos: result });
  }
);

module.exports = router;