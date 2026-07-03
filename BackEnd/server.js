// BackEnd/server.js
import { createServer }  from "http";
import express           from "express";
import { Server }        from "socket.io";
import dotenv            from "dotenv";
import cors              from "cors";
import helmet            from "helmet";

import { connectDB }      from "./db.js";
import { setupSocket }    from "./socket.js";

import authRouter         from "./routes/auth.js";
import swipesRouter       from "./routes/swipes.js";
import businessesRouter   from "./routes/businesses.js";
import jobsRouter         from "./routes/jobs.js";
import matchesRouter      from "./routes/matches.js";
import messagesRouter     from "./routes/messages.js";
import questionnaireRouter from "./routes/questionnaire.js";
import errorHandler       from "./middleware/errorHandler.js";

dotenv.config();

const app        = express();
const httpServer = createServer(app);    // wrap Express in an HTTP server for Socket.io

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: "*" },  // tighten this to your app's origin in production
});
setupSocket(io);

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors());

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ─── Static uploads (local disk fallback) ─────────────────────────────────────
app.use("/uploads", express.static("uploads"));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth",       authRouter);
app.use("/swipes",     swipesRouter);
app.use("/businesses", businessesRouter);
app.use("/jobs",       jobsRouter);
app.use("/matches",    matchesRouter);
app.use("/questionnaire", questionnaireRouter);
app.use("/messages",   messagesRouter);

// ─── Global error handler — must be last ──────────────────────────────────────
app.use(errorHandler);

// ─── Start — MongoDB first, then HTTP + WebSocket ─────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server + WebSocket running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌  Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
