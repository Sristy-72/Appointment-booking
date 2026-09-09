require("dotenv").config();
const mongoose = require("mongoose");
const Provider = require("./models/Provider");

const providers = [
  {
    name: "Dr. Rahul Sharma",
    specialization: "Cardiologist",
    experience: 8,
    availableSlots: ["09:00", "10:00", "11:00", "14:00", "15:00"],
  },
  {
    name: "Dr. Priya Singh",
    specialization: "Dermatologist",
    experience: 6,
    availableSlots: ["09:00", "10:00", "12:00", "15:00", "16:00"],
  },
  {
    name: "Dr. Amit Verma",
    specialization: "Orthopedic",
    experience: 10,
    availableSlots: ["10:00", "11:00", "13:00", "14:00", "16:00"],
  },
  {
    name: "Dr. Neha Gupta",
    specialization: "Dentist",
    experience: 5,
    availableSlots: ["09:00", "11:00", "13:00", "15:00", "17:00"],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/appoint");

    await Promise.all(
      providers.map((provider) =>
        Provider.findOneAndUpdate(
          { name: provider.name },
          { $set: provider },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
        ),
      ),
    );

    console.log("Providers seeded successfully");

    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

seed();
