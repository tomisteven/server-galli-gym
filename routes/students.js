const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { faker } = require('@faker-js/faker');


// Ruta para obtener todos los estudiantes
router.get('/', async (req, res) => {
    try {
        const students = await Student.find({});
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
    });

    // Registrar ingreso de alumno
router.get('/ingresa/:dni', async (req, res) => {
  try {
    const dni = req.params.dni;
    const student = await Student.findOne({ dni });

    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    // Registrar la asistencia con la fecha y hora actual
    student.asistencias.push(new Date());
    await student.save();

    res.json({
      success: true,
      message: `Ingreso registrado para ${student.name} ${student.lastName}`,
      student: {
        dni: student.dni,
        name: student.name,
        lastName: student.lastName,
        asistencias: student.asistencias
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error al registrar ingreso: ' + err.message
    });
  }
});


// Obtener estudiante por DNI
router.get('/alumno/:dni', async (req, res) => {
  try {
    const student = await Student.findOne({ dni: req.params.dni });
    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para cargar estudiantes masivos
router.get('/cargar-masivo', async (req, res) => {
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
      count: studentsData.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error al cargar datos masivos: ' + err.message
    });
  }
});

// Función para generar estudiantes ficticios
function generateFakeStudents(count) {
  const students = [];
  const plans = ['Básico', 'Premium', 'Gold', 'Familiar'];
  const paymentStatuses = ['Al día', 'Vencido', 'Pendiente'];

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
        amount: faker.number.int({ min: 2000, max: 8000 })
      });
    }

    students.push({
      dni: faker.number.int({ min: 20000000, max: 45000000 }).toString(),
      name: firstName,
      lastName: lastName,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number('11-####-####'),
      birthDate: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
      planType: faker.helpers.arrayElement(plans),
      paymentDueDate: dueDate,
      paymentHistory: paymentHistory,
      status: faker.helpers.arrayElement(paymentStatuses),
      joinDate: faker.date.past({ years: 3 })
    });
  }

  return students;
}


module.exports = router;