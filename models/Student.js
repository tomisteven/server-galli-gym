const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  dni: { type: String, required: true, unique: true },
  medicamento: { type: String, required: true, default: "Ninguno" },
  patologias: { type: String, required: true, default: "Ninguna" },

  name: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  birthDate: { type: Date, required: true },
  activo: { type: Boolean, default: true },
  planType: { type: String, required: true },
  asistencias: [{ type: Date }],
  paymentHistory: [
    {
      paymentDate: { type: Date, default: Date.now },
      amount: Number,
    },
  ],
  paymentDueDate: { type: Date, required: true },
});

module.exports = mongoose.model("Student", studentSchema);
