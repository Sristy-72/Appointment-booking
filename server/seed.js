require("dotenv").config();
const mongoose = require("mongoose");
const Provider = require("./models/Provider");
const providers = require("./data/providers");

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
