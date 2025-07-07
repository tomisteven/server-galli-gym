const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  dni: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  birthDate: { type: Date, required: true },
  planType: { type: String, required: true },
    asistencias: [{ type: Date }],
  paymentHistory: [{
    paymentDate: { type: Date, default: Date.now },
    amount: Number
  }],
  paymentDueDate: { type: Date, required: true }
});

module.exports = mongoose.model('Student', studentSchema);