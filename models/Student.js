const { ja } = require("@faker-js/faker");
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  dni: { type: String, required: true, unique: true },
  medicamento: { type: String, required: true, default: "Ninguno" },
  patologias: { type: String, required: true, default: "Ninguna" },
  joinDate: { type: Date, default: Date.now },
  name: { type: String },
  lastName: { type: String },
  email: { type: String, default: "" },
  phone: { type: String, required: true, default: "" },
  birthDate: { type: String, required: true, default: "" },
  activo: { type: Boolean, default: true },
  planType: { type: String },
  asistencias: [{ type: Date }],
  paymentHistory: [
    {
      paymentDate: { type: Date, default: Date.now },
      amount: Number,
    },
  ],
  paymentDueDate: { type: Date },
});

module.exports = mongoose.model("Student", studentSchema);
