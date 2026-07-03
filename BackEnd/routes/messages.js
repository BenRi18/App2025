// BackEnd/routes/messages.js
// REST endpoints for chat history — the real-time layer is in socket.js.
import express        from "express";
import Message        from "../models/Message.js";
import Match          from "../models/Match.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ─── GET /messages/:matchId ───────────────────────────────────────────────────
// Returns paginated message history for a match.
// Query params: ?limit=50&before=<messageId>  (cursor-based pagination)
router.get("/:matchId", authMiddleware, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { matchId }  = req.params;
    const limit  = Math.min(parseInt(req.query.limit  || "50"), 100);
    const before = req.query.before; // last message ID from previous page

    // Confirm the caller belongs to this match
    const matchFilter = role === "user"
      ? { _id: matchId, user_id:     id }
      : { _id: matchId, business_id: id };
    const match = await Match.findOne(matchFilter);
    if (!match) return res.status(404).json({ error: "Match not found or access denied" });

    const msgFilter = { match_id: matchId };
    if (before) msgFilter._id = { $lt: before };  // messages older than cursor

    // Fetch one extra to detect if there are more pages
    const raw = await Message
      .find(msgFilter)
      .sort({ createdAt: -1 })   // newest first for cursor pagination
      .limit(limit + 1);

    const hasMore  = raw.length > limit;
    const messages = raw.slice(0, limit).reverse();  // oldest-first for display

    res.json({ messages: messages.map(m => m.toJSON()), hasMore });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /messages/:matchId/read ────────────────────────────────────────────
// Mark all messages in a match as read for the current party.
router.patch("/:matchId/read", authMiddleware, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { matchId }  = req.params;

    const matchFilter = role === "user"
      ? { _id: matchId, user_id:     id }
      : { _id: matchId, business_id: id };
    const match = await Match.findOne(matchFilter);
    if (!match) return res.status(404).json({ error: "Match not found or access denied" });

    // Mark messages sent by the OTHER party as read
    await Message.updateMany(
      { match_id: matchId, sender_role: { $ne: role }, read: false },
      { read: true }
    );

    // Reset unread counter
    const unreadField = role === "user" ? "unread_user" : "unread_business";
    await Match.updateOne({ _id: matchId }, { [unreadField]: 0 });

    res.json({ message: "Messages marked as read" });
  } catch (err) {
    next(err);
  }
});

export default router;
