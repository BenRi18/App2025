// BackEnd/db.js
// Mongoose connection helper.
// Call connectDB() once at server startup (see server.js).
import mongoose from "mongoose";
import dotenv   from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;

export async function connectDB() {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set.\n" +
      "Copy .env.example → .env and paste your Atlas connection string."
    );
  }

  await mongoose.connect(uri, {
    // Recommended options for Atlas
    serverSelectionTimeoutMS: 5000,  // fail fast if Atlas is unreachable
    socketTimeoutMS:          45000,
  });

  console.log("✅  MongoDB connected →", mongoose.connection.name);
}

// Graceful shutdown — close the connection when the process exits
process.on("SIGINT",  () => mongoose.connection.close().then(() => process.exit(0)));
process.on("SIGTERM", () => mongoose.connection.close().then(() => process.exit(0)));

export default mongoose;
