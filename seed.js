const mongoose = require('mongoose');
const Student = require('./models/Student');
require('dotenv').config();

const studentsData = [
  {
    dni: "12345678",
    name: "Juan",
    lastName: "Pérez",
    email: "juan@example.com",
    phone: "555-1234",
    birthDate: new Date(1990, 5, 15),
    planType: "Premium",
    paymentDueDate: new Date(2023, 11, 31),
    paymentHistory: [
      { paymentDate: new Date(2023, 10, 5), amount: 5000 },
      { paymentDate: new Date(2023, 9, 5), amount: 5000 }
    ]
  },
  {
    dni: "87654321",
    name: "María",
    lastName: "Gómez",
    email: "maria@example.com",
    phone: "555-5678",
    birthDate: new Date(1985, 8, 22),
    planType: "Básico",
    paymentDueDate: new Date(2023, 10, 15),
    paymentHistory: [
      { paymentDate: new Date(2023, 9, 10), amount: 3000 }
    ]
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect('mongodb+srv://factosdev:admin@cluster0.giaormv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    await Student.deleteMany({});
    await Student.insertMany(studentsData);

    console.log('Base de datos poblada exitosamente!');
    process.exit();
  } catch (err) {
    console.error('Error al poblar la base de datos:', err);
    process.exit(1);
  }
};

seedDatabase();