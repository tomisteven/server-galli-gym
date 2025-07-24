const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const { faker } = require("@faker-js/faker");
const configureCloudinary = require("../cloudinary");
const cloudinary = require("cloudinary").v2;
const multipart = require("connect-multiparty");
const md_upload = multipart({ uploadDir: "./uploads" });
const fs = require("fs");

// Ruta para obtener todos los estudiantes
router.get("/", async (req, res) => {
  try {
    const students = await Student.find({}).lean();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.post("/nuevo", [md_upload, configureCloudinary], async (req, res) => {
  try {
    const { dni } = req.body;

    // Verificar si el estudiante ya existe por DNI
    const existingStudent = await Student.findOne({ dni: dni });
    if (existingStudent) {
      return res.status(400).json({ error: "El estudiante ya existe" });
    }
    // Verificar si se subió una imagen
    if (req.files && req.files.image) {
      const imageFile = req.files.image.path;

      // Subir imagen a Cloudinary
      const result = await cloudinary.uploader
        .upload(imageFile, {
          use_filename: true,
          unique_filename: false,
        })
        .catch((error) => {
          console.error("Error al subir la imagen a Cloudinary:", error);
          return res.status(500).json({ error: "Error al subir la imagen" });
        });
      console.log("Imagen subida a Cloudinary:", result.secure_url);
      req.body.image = result.secure_url; // Guardar URL de la imagen en el cuerpo de la solicitud

      // Eliminar el archivo temporal
      fs.unlink(imageFile, (err) => {
        if (err) {
          console.error("Error al eliminar el archivo temporal:", err);
        } else {
          console.log("Archivo temporal eliminado exitosamente");
        }
      });
    }

    // Crear un nuevo estudiante
    const newStudent = new Student(req.body);
    // si no llega fecha de vencimiento se asigna la fecha de hoy mas 30 días
    if (!newStudent.paymentDueDate) {
      const today = new Date();
      today.setDate(today.getDate() + 30);
      newStudent.paymentDueDate = today;
    }

    await newStudent.save();

    res.status(201).json({
      success: true,
      message: "Estudiante creado exitosamente",
      newStudent,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error al crear el estudiante: " + err.message,
    });
  }
});

// Actualizar estudiante por DNI
router.put("/actualizar/:dni", [md_upload, configureCloudinary], async (req, res) => {
  try {
    const dni = req.params.dni;

    // 🔄 Subir imagen a Cloudinary si viene una imagen en el request
    if (req.files && req.files.image) {
      const imageFile = req.files.image.path;

      const result = await cloudinary.uploader
        .upload(imageFile, {
          use_filename: true,
          unique_filename: false,
        })
        .catch((error) => {
          console.error("Error al subir la imagen a Cloudinary:", error);
          return res.status(500).json({ error: "Error al subir la imagen" });
        });

      console.log("Imagen subida a Cloudinary:", result.secure_url);
      req.body.image = result.secure_url;

      // Borrar archivo temporal
      fs.unlinkSync(imageFile);
      console.log("Archivo temporal eliminado exitosamente");
    }

    const updatedData = req.body;

    // 🔍 Parsear paymentHistory si vino como string (por multipart/form-data)
    if (typeof updatedData.paymentHistory === "string") {
      try {
        updatedData.paymentHistory = JSON.parse(updatedData.paymentHistory);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: "Formato inválido en paymentHistory. Debe ser un JSON válido.",
        });
      }
    }

    // ✅ Opcional: Validar manualmente que cada entrada tenga amount y paymentDate válidos
    if (Array.isArray(updatedData.paymentHistory)) {
      const isValid = updatedData.paymentHistory.every(entry =>
        entry &&
        typeof entry === "object" &&
        typeof entry.amount === "number" &&
        !isNaN(entry.amount) &&
        new Date(entry.paymentDate).toString() !== "Invalid Date"
      );
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: "paymentHistory contiene datos inválidos",
        });
      }
    }

    // 🔁 Actualizar estudiante
    const updatedStudent = await Student.findOneAndUpdate(
      { dni: dni },
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    res.json({
      success: true,
      message: "Estudiante actualizado exitosamente",
      updatedStudent,
    });

  } catch (err) {
    console.error("Error interno:", err);
    res.status(500).json({
      success: false,
      error: "Error al actualizar el estudiante: " + err.message,
    });
  }
});


// backend/routes/students.js

router.post("/agregar-pago/historial/:dni", async (req, res) => {
  try {
    const dni = req.params.dni;
    let { amount } = req.body;

    console.log("Datos recibidos:", { dni, amount });

    // Validar monto
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Monto inválido" });
    }

    const student = await Student.findOne({ dni });
    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    // 🔥 Filtrar entradas corruptas (muy importante)
    student.paymentHistory = student.paymentHistory.filter((entry) => {
      return entry && typeof entry === "object" && entry.amount !== "";
    });

    // Agregar nuevo pago
    student.paymentHistory.push({
      paymentDate: new Date(),
      amount,
    });

    await student.save();

    res.json({
      success: true,
      message: "Pago agregado exitosamente",
      student,
    });
  } catch (err) {
    console.error("Error interno:", err);
    res.status(500).json({
      success: false,
      error: "Error al agregar el pagoooo: " + err.message,
    });
  }
});

router.post("/agregar-pago/:dni", async (req, res) => {
  try {
    const dni = req.params.dni;
    const { amount } = req.body;

    // Buscar el estudiante por DNI
    const student = await Student.findOne({ dni: dni });
    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    // Agregar el pago al historial
    const paymentDate = new Date();

    const paymentHistoryEntry = {
      paymentDate: paymentDate,
      amount: parseFloat(amount),
    };

    student.paymentHistory.push(paymentHistoryEntry);

    // Calcular nuevo vencimiento manteniendo el día original
    const calculateNextDueDate = (currentDueDate) => {
      const nextDueDate = new Date(currentDueDate);

      // Obtener el día original del mes
      const originalDay = nextDueDate.getDate();

      // Sumar un mes
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      // Ajustar si el nuevo mes tiene menos días
      const daysInNextMonth = new Date(
        nextDueDate.getFullYear(),
        nextDueDate.getMonth() + 1,
        0
      ).getDate();

      // Si el día original es mayor que los días del próximo mes, usar el último día
      if (originalDay > daysInNextMonth) {
        nextDueDate.setDate(daysInNextMonth);
      } else {
        nextDueDate.setDate(originalDay);
      }

      return nextDueDate;
    };

    // Calcular nuevo vencimiento
    if (student.paymentDueDate) {
      // Si ya existe una fecha de vencimiento, usarla como base
      student.paymentDueDate = calculateNextDueDate(student.paymentDueDate);
    } else {
      // Si es el primer pago, usar la fecha de ingreso como base
      student.paymentDueDate = calculateNextDueDate(student.joinDate);
    }

    console.log("Fecha de Ingreso:", student.joinDate);
    console.log("fecha pago", paymentDate);

    console.log("Nuevo vencimiento:", student.paymentDueDate);

    // Guardar los cambios
    await student.save();

    res.json({
      success: true,
      message: "Pago agregado exitosamente",
      student,
      fechaIngreso: student.joinDate,
      fechaPago: paymentDate,
      nuevoVencimiento: student.paymentDueDate,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error al agregar el pago: " + err.message,
    });
  }
});

/* router.post("/agregar-pago/:dni", async (req, res) => {
  try {
    const dni = req.params.dni;
    const { amount } = req.body;
    // Buscar el estudiante por DNI
    const student = await Student.findOne({ dni: dni });
    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    // Agregar el pago al historial
    const paymentDate = new Date();
    student.paymentHistory.push({ paymentDate, amount });
    // Actualizar la fecha de vencimiento del pago
    //const nextDueDate = new Date(paymentDate);
    //nextDueDate.setMonth(nextDueDate.getMonth() + 1); // Sumar un mes
    //student.paymentDueDate = nextDueDate;
    // Guardar los cambios
    await student.save();
    res.json({
      success: true,
      message: "Pago agregado exitosamente",
      student,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error al agregar el pago: " + err.message,
    });
  }
}); */

// Dar de baja a un estudiante por DNI
router.delete("/baja/:dni", async (req, res) => {
  try {
    const dni = req.params.dni;
    // Buscar y eliminar el estudiante por DNI
    const deletedStudent = await Student.findOneAndDelete({ dni: dni });
    // Si no se encuentra el estudiante, retornar error 404
    if (!deletedStudent) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    res.json({
      success: true,
      message: `Estudiante ${deletedStudent.name} ${deletedStudent.lastName} dado de baja`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error al dar de baja el estudiante: " + err.message,
    });
  }
});

// Registrar ingreso de alumno
router.get("/ingresa/:dni", async (req, res) => {
  try {
    const dni = req.params.dni;
    const student = await Student.findOne({ dni });

    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    //verificar que no se haya registrado ingreso en el mismo día
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0
    );
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );
    const hasCheckedInToday = student.asistencias.some(
      (date) => date >= todayStart && date <= todayEnd
    );
    if (hasCheckedInToday) {
      return res
        .status(400)
        .json({ student, error: "Ya se registró un ingreso hoy" });
    }
    // Registrar ingreso
    student.asistencias.push(new Date());
    await student.save();

    res.json(student);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error al registrar ingreso: " + err.message,
    });
  }
});

router.delete("/eliminar/:dni", async (req, res) => {
  try {
    const dni = req.params.dni;
    const deletedStudent = await Student.findOneAndDelete({ dni: dni });
    if (!deletedStudent) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    res.json({
      success: true,
      message: `Estudiante ${deletedStudent.name} ${deletedStudent.lastName} eliminado exitosamente`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error al eliminar el estudiante: " + err.message,
    });
  }
});

// Obtener estudiante por DNI
router.get("/alumno/:dni", async (req, res) => {
  try {
    const student = await Student.findOne({ dni: req.params.dni });
    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Ruta para cargar estudiantes masivos
router.get("/cargar-masivo", async (req, res) => {
  try {
    // Generamos 25 estudiantes ficticios
    const studentsData = generateFakeStudents(25);

    // Eliminamos los estudiantes existentes para evitar duplicados
    await Student.deleteMany({});

    // Insertamos los nuevos estudiantes
    await Student.insertMany(studentsData);

    res.json({
      success: true,
      message: `${studentsData.length} estudiantes cargados exitosamente`,
      count: studentsData.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Error al cargar datos masivos: " + err.message,
    });
  }
});

// Función para generar estudiantes ficticios
function generateFakeStudents(count) {
  const students = [];
  const plans = ["Básico", "Premium", "Gold", "Familiar"];
  const paymentStatuses = ["Al día", "Vencido", "Pendiente"];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    // Generar fecha de vencimiento aleatoria (entre -15 y +15 días)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) - 15);

    // Generar historial de pagos (1-12 pagos)
    const paymentCount = Math.floor(Math.random() * 12) + 1;
    const paymentHistory = [];

    for (let j = 0; j < paymentCount; j++) {
      paymentHistory.push({
        paymentDate: faker.date.past({ years: 1 }),
        amount: faker.number.int({ min: 2000, max: 8000 }),
      });
    }

    students.push({
      dni: faker.number.int({ min: 20000000, max: 45000000 }).toString(),
      name: firstName,
      lastName: lastName,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number("11-####-####"),
      birthDate: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
      planType: faker.helpers.arrayElement(plans),
      paymentDueDate: dueDate,
      paymentHistory: paymentHistory,
      status: faker.helpers.arrayElement(paymentStatuses),
      joinDate: faker.date.past({ years: 3 }),
    });
  }

  return students;
}

module.exports = router;
