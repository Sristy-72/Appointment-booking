const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Appointment = require("./models/Appointment");
const AppointmentCounter = require("./models/AppointmentCounter");
const Provider = require("./models/Provider");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/appointment";
const statuses = ["Pending", "Confirmed", "Completed", "Cancelled"];

function isValidDate(value) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00`))
  );
}

function appointmentResponse(appointment) {
  return appointment.populate("providerId", "name specialization");
}

async function nextAppointmentId() {
  const year = new Date().getFullYear();
  const counter = await AppointmentCounter.findOneAndUpdate(
    { year },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `APT-${year}-${String(counter.value).padStart(3, "0")}`;
}

app.get("/api/providers", async (_req, res, next) => {
  try {
    const providers = await Provider.find().sort({ name: 1 });
    res.json(providers);
  } catch (error) {
    next(error);
  }
});

app.get("/api/providers/:providerId/slots", async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) {
      return res.status(400).json({ message: "A valid date is required." });
    }

    const provider = await Provider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }

    const bookings = await Appointment.find({
      providerId: provider._id,
      date,
      isActive: true,
    }).select("time");
    const bookedSlots = bookings.map((booking) => booking.time);
    const availableSlots = provider.availableSlots.filter(
      (slot) => !bookedSlots.includes(slot),
    );

    res.json({ providerId: provider._id, date, availableSlots, bookedSlots });
  } catch (error) {
    next(error);
  }
});

app.post("/api/appointments", async (req, res, next) => {
  try {
    const { name, email, providerId, date, time, reason } = req.body;
    if (
      ![name, email, providerId, date, time, reason].every(Boolean) ||
      !isValidDate(date)
    ) {
      return res.status(400).json({
        message: "Name, email, provider, date, time, and reason are required.",
      });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }
    if (!provider.availableSlots.includes(time)) {
      return res
        .status(400)
        .json({ message: "That time slot is unavailable." });
    }

    const appointment = await Appointment.create({
      appointmentId: await nextAppointmentId(),
      name,
      email,
      providerId,
      date,
      time,
      reason,
    });
    await appointmentResponse(appointment);
    res.status(201).json(appointment);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "That slot was just booked. Please choose another time.",
      });
    }
    next(error);
  }
});

app.get("/api/appointments", async (req, res, next) => {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "An email address is required." });
    }
    const appointments = await Appointment.find({ email })
      .populate("providerId", "name specialization")
      .sort({ date: -1, time: -1 });
    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/appointments/:appointmentId/cancel", async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      appointmentId: req.params.appointmentId,
    });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }
    if (appointment.status === "Completed") {
      return res
        .status(400)
        .json({ message: "Completed appointments cannot be cancelled." });
    }
    appointment.status = "Cancelled";
    appointment.isActive = false;
    await appointment.save();
    await appointmentResponse(appointment);
    res.json(appointment);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/appointments", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.providerId = req.query.provider;

    const appointments = await Appointment.find(filter)
      .populate("providerId", "name specialization")
      .sort({ date: -1, time: -1 });
    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/admin/appointments/:appointmentId/status",
  async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!statuses.includes(status)) {
        return res
          .status(400)
          .json({ message: "Choose a valid appointment status." });
      }
      const appointment = await Appointment.findOne({
        appointmentId: req.params.appointmentId,
      });
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found." });
      }
      if (appointment.status === "Cancelled" && status !== "Cancelled") {
        return res
          .status(400)
          .json({ message: "Cancelled appointments cannot be reopened." });
      }

      appointment.status = status;
      appointment.isActive = status !== "Cancelled";
      await appointment.save();
      await appointmentResponse(appointment);
      res.json(appointment);
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ message: "This slot is already in use." });
      }
      next(error);
    }
  },
);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
