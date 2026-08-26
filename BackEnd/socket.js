// BackEnd/socket.js
// Socket.io server — real-time chat for matched users and businesses.
//
// Client connection (React Native):
//   import { io } from "socket.io-client";
//   const socket = io("http://localhost:3000", { auth: { token: accessToken } });
//
// Events emitted by client:
//   join_match(matchId)                       — join a match chat room
//   send_message({ matchId, content })        — send a message
//   typing({ matchId, isTyping })             — typing indicator
//   mark_read({ matchId })                    — mark messages as read
//
// Events emitted by server:
//   message(messageDoc)                       — new message (broadcast to room)
//   typing({ userId, isTyping })              — typing indicator (broadcast to room)
//   error({ message })                        — error response

import jwt      from "jsonwebtoken";
import Match    from "./models/Match.js";
import Message  from "./models/Message.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET is missing or too short (need 32+ chars). Refusing to start: " +
    "a weak or default signing key lets anyone forge login tokens."
  );
}

// Module-level io reference so routes can emit events
let _io = null;

export function getIO() { return _io; }

export function setupSocket(io) {
  _io = io;

  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const { id, role } = socket.user;
    console.log(`🔌 Socket connected: ${id} (${role})`);

    // ── Join a match room ──────────────────────────────────────────────────
    socket.on("join_match", async (matchId) => {
      try {
        // Verify the user belongs to this match
        const query = role === "user"
          ? { _id: matchId, user_id:     id }
          : { _id: matchId, business_id: id };
        const match = await Match.findOne(query);
        if (!match) return socket.emit("error", { message: "Match not found or access denied" });

        socket.join(`match:${matchId}`);
      } catch (err) {
        socket.emit("error", { message: "Failed to join match" });
      }
    });

    // ── Send a message ─────────────────────────────────────────────────────
    socket.on("send_message", async ({ matchId, content }) => {
      try {
        if (!content?.trim()) return socket.emit("error", { message: "Message cannot be empty" });
        if (typeof content !== "string" || content.length > 2000) {
          return socket.emit("error", { message: "Message too long (2000 characters max)" });
        }

        const query = role === "user"
          ? { _id: matchId, user_id:     id }
          : { _id: matchId, business_id: id };
        const match = await Match.findOne(query);
        if (!match) return socket.emit("error", { message: "Match not found or access denied" });

        const msg = await Message.create({
          match_id:    matchId,
          sender_id:   id,
          sender_role: role,
          content:     content.trim().slice(0, 1000),
        });

        // Update match preview + unread counter for the OTHER party
        const unreadField = role === "user" ? "unread_business" : "unread_user";
        await Match.updateOne(
          { _id: matchId },
          {
            last_message:    msg.content,
            last_message_at: msg.createdAt,
            $inc: { [unreadField]: 1 },
          }
        );

        // Broadcast to everyone in the room (including sender for confirmation)
        io.to(`match:${matchId}`).emit("message", msg.toJSON());

      } catch (err) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── Typing indicator ───────────────────────────────────────────────────
    socket.on("typing", ({ matchId, isTyping }) => {
      socket.to(`match:${matchId}`).emit("typing", { userId: id, senderRole: role, isTyping });
    });

    // ── Mark messages as read ──────────────────────────────────────────────
    socket.on("mark_read", async ({ matchId }) => {
      try {
        await Message.updateMany(
          { match_id: matchId, sender_role: { $ne: role }, read: false },
          { read: true }
        );

        // Reset unread counter for this party
        const unreadField = role === "user" ? "unread_user" : "unread_business";
        await Match.updateOne({ _id: matchId }, { [unreadField]: 0 });

        socket.to(`match:${matchId}`).emit("messages_read", { matchId, byRole: role });
      } catch (err) {
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${id}`);
    });
  });
}
