const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// ── Message Schema ──
const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content:    { type: String, required: true },
  timestamp:  { type: Date, default: Date.now },
});
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

// ── Profile Schema (for photo + username lookup) ──
const profileSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  username: { type: String, required: true },
  photo:    { type: String, default: null },
});
const Profile = mongoose.models.Profile || mongoose.model("Profile", profileSchema);

// ────────────────────────────────────────────────────
//  GET /api/messages/conversations/:userId
//  Returns the list of people this user has chatted with,
//  with the last message and timestamp — for the sidebar.
// ────────────────────────────────────────────────────
router.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const uid = new mongoose.Types.ObjectId(userId);

    // Aggregate: find all messages involving this user,
    // group by the "other" person, keep only the latest message per conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: uid }, { receiverId: uid }],
        },
      },
      {
        // Create a field "otherId" = the person who is NOT the current user
        $addFields: {
          otherId: {
            $cond: {
              if:   { $eq: ["$senderId", uid] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
        },
      },
      // Sort newest first so $first gives the latest message
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id:           "$otherId",
          lastMessage:   { $first: "$content" },
          lastTimestamp: { $first: "$timestamp" },
          lastSenderId:  { $first: "$senderId" },
        },
      },
      // Sort conversations newest first
      { $sort: { lastTimestamp: -1 } },
    ]);

    if (conversations.length === 0) return res.json([]);

    // Fetch profiles of all "other" users in one query
    const otherIds = conversations.map(c => c._id);
    const profiles  = await Profile.find({ userId: { $in: otherIds } });

    const profileMap = {};
    for (const p of profiles) {
      profileMap[p.userId.toString()] = p;
    }

    const enriched = conversations.map(c => ({
      otherId:       c._id,
      username:      profileMap[c._id.toString()]?.username || "Unknown User",
      photo:         profileMap[c._id.toString()]?.photo    || null,
      lastMessage:   c.lastMessage,
      lastTimestamp: c.lastTimestamp,
      lastSenderId:  c.lastSenderId,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("conversations error:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/messages/:userId/:otherId
//  Returns all messages between two users, oldest first.
// ────────────────────────────────────────────────────
router.get("/:userId/:otherId", async (req, res) => {
  try {
    const { userId, otherId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId,  receiverId: otherId },
        { senderId: otherId, receiverId: userId  },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error("fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ────────────────────────────────────────────────────
//  POST /api/messages
//  Save a message to MongoDB (Socket.io also calls this
//  internally — but we expose it as REST too for safety).
// ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    if (!senderId || !receiverId || !content?.trim()) {
      return res.status(400).json({ error: "senderId, receiverId and content are required" });
    }

    const message = new Message({ senderId, receiverId, content: content.trim() });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    console.error("save message error:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

module.exports = router;