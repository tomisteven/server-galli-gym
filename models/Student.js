const { ja } = require("@faker-js/faker");
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  dni: { type: String, required: true, unique: true },
  medicamento: { type: String, default: "Ninguno" },
  patologias: { type: String, default: "Ninguna" },
  joinDate: { type: Date, default: Date.now },
  name: { type: String },
  image: { type: String },
  lastName: { type: String },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  birthDate: { type: String, default: "" },
  activo: { type: Boolean, default: true },
  planType: { type: String },
  asistencias: [{ type: Date }],
  paymentHistory: [
     {
    paymentDate: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
  },
  ],
  paymentDueDate: { type: Date },
});

module.exports = mongoose.model("Student", studentSchema);
