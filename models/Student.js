const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentDate: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const studentSchema = new mongoose.Schema(
  {
    dni: { type: String, required: true, unique: true, trim: true },
    medicamento: { type: String, default: "Ninguno" },
    patologias: { type: String, default: "Ninguna" },
    joinDate: { type: Date, default: Date.now },
    name: { type: String, trim: true },
    image: { type: String },
    lastName: { type: String, trim: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    birthDate: { type: String, default: "" },
    activo: { type: Boolean, default: true },
    planType: { type: String },
    asistencias: [{ type: Date }],
    paymentHistory: [paymentSchema],
    paymentDueDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Índices para acelerar las consultas más frecuentes
// dni ya tiene índice único por el constraint `unique: true`.
studentSchema.index({ paymentDueDate: 1 });
studentSchema.index({ asistencias: 1 });
studentSchema.index({ planType: 1 });

module.exports = mongoose.model("Student", studentSchema);