// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import swipesRouter from "./routes/swipes.js"; // note the .js extension
import authRouter from "./routes/auth.js"; // if you have auth routes

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/swipes", swipesRouter);
app.use("/auth", authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
