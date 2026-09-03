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
  cors: { origin: "*" },        // mobile clients send no Origin; auth is by JWT
  maxHttpBufferSize: 1e6,       // 1 MB cap — stops oversized socket payloads
  pingTimeout: 30000,
});
setupSocket(io);

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── Global rate limit ────────────────────────────────────────────────────────
// A backstop across every endpoint so no single client can flood the API even
// on routes without their own limiter. Generous enough for normal app use.
import { makeRateLimiter } from "./middleware/rateLimiter.js";
app.use(makeRateLimiter(300, 60 * 1000));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Behind a hosting proxy (Railway/Render/Fly) — needed for correct client IPs
app.set("trust proxy", 1);

// ─── Process-level safety net ─────────────────────────────────────────────────
// Without these, one unhandled promise rejection anywhere (a failed push, a
// dropped S3 call) takes the whole backend down and every user loses service.
// Log loudly, keep serving.
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled promise rejection:", reason?.message ?? reason);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught exception:", err?.message ?? err);
  console.error(err?.stack);
  // An uncaught exception leaves state unknown — exit so the host restarts us
  // cleanly rather than serving from a corrupted process.
  process.exit(1);
});

// CORS: mobile apps send no Origin header, so a permissive default is fine;
// set ALLOWED_ORIGINS (comma-separated) to restrict web callers in production.
const allowed = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim());
app.use(cors(allowed?.length ? { origin: allowed } : {}));

// Health check for the hosting platform's uptime probes
app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

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
// ─── Unknown routes ───────────────────────────────────────────────────────────
// Without this, a typo'd endpoint returns Express's HTML error page, which the
// app tries to parse as JSON and reports as a confusing parse failure.
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

// ─── Start — MongoDB first, then HTTP + WebSocket ─────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server + WebSocket running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌  Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
