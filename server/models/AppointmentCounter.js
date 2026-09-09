const mongoose = require("mongoose");

const appointmentCounterSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true,
  },
  value: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("AppointmentCounter", appointmentCounterSchema);
