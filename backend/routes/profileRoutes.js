const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  username:  { type: String, required: true },
  photo:     { type: String, default: null },
  bio:       { type: String, default: "" },
  interests: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Profile = mongoose.models.Profile || mongoose.model("Profile", profileSchema);

const friendRequestSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status:     { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  createdAt:  { type: Date, default: Date.now },
});
const FriendRequest = mongoose.models.FriendRequest || mongoose.model("FriendRequest", friendRequestSchema);

// ─────────────────────────────────────────────────────────────────────────────
//  ALL STATIC / SPECIFIC ROUTES MUST COME BEFORE  /:userId
// ─────────────────────────────────────────────────────────────────────────────

// ── Search users by username ──────────────────────────────────────────────────
router.get("/search/users", async (req, res) => {
  try {
    const { q, currentUserId } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);
    const profiles = await Profile.find({
      username: { $regex: q.trim(), $options: "i" },
      userId:   { $ne: currentUserId },
    }).limit(20);
    res.json(profiles);
  } catch (err) {
    console.error("search/users error:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// ── Send friend request ───────────────────────────────────────────────────────
router.post("/friends/request", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId)
      return res.status(400).json({ error: "senderId and receiverId are required" });
    if (senderId.toString() === receiverId.toString())
      return res.status(400).json({ error: "Cannot send request to yourself" });

    // Check for any existing request in either direction
    const existing = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existing) {
      // If it was rejected before, allow re-sending by deleting old record first
      if (existing.status === "rejected") {
        await FriendRequest.findByIdAndDelete(existing._id);
        // fall through to create a new one
      } else {
        return res.status(400).json({ error: "Friend request already exists", request: existing });
      }
    }

    const request = new FriendRequest({ senderId, receiverId, status: "pending" });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    console.error("friends/request POST error:", err);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// ── Cancel (withdraw) a pending request — sender only ────────────────────────
router.delete("/friends/request/:requestId", async (req, res) => {
  try {
    const { userId } = req.body;
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.senderId.toString() !== userId.toString())
      return res.status(403).json({ error: "Not authorized" });
    await FriendRequest.findByIdAndDelete(req.params.requestId);
    res.json({ message: "Request cancelled" });
  } catch (err) {
    console.error("friends/request DELETE error:", err);
    res.status(500).json({ error: "Failed to cancel request" });
  }
});

// ── Accept or reject a request — receiver only ───────────────────────────────
router.put("/friends/request/:requestId", async (req, res) => {
  try {
    const { status, userId } = req.body;
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.receiverId.toString() !== userId.toString())
      return res.status(403).json({ error: "Not authorized" });
    request.status = status;
    await request.save();
    res.json(request);
  } catch (err) {
    console.error("friends/request PUT error:", err);
    res.status(500).json({ error: "Failed to update friend request" });
  }
});

// ── List accepted friends of a user ──────────────────────────────────────────
router.get("/friends/list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const accepted = await FriendRequest.find({
      status: "accepted",
      $or: [{ senderId: userId }, { receiverId: userId }],
    });
    const friendIds = accepted.map(r =>
      r.senderId.toString() === userId.toString() ? r.receiverId : r.senderId
    );
    const profiles = await Profile.find({ userId: { $in: friendIds } });
    res.json(profiles);
  } catch (err) {
    console.error("friends/list error:", err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// ── Pending requests received by a user (with senderProfile enriched) ─────────
// FIX: uses a string-keyed Map to avoid ObjectId comparison failures
router.get("/friends/pending/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const requests = await FriendRequest.find({
      receiverId: userId,
      status: "pending",
    });

    if (requests.length === 0) return res.json([]);

    // Gather sender IDs as strings for reliable lookup
    const senderIds = requests.map(r => r.senderId);

    // Fetch all sender profiles in one query
    const profiles = await Profile.find({ userId: { $in: senderIds } });

    // Build a string-keyed map so comparison never fails on ObjectId vs string
    const profileMap = {};
    for (const p of profiles) {
      profileMap[p.userId.toString()] = p.toObject();
    }

    const enriched = requests.map(r => ({
      ...r.toObject(),
      senderProfile: profileMap[r.senderId.toString()] || null,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("friends/pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending requests" });
  }
});

// ── Get request status between two users ─────────────────────────────────────
router.get("/friends/status/:userId/:otherId", async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    const request = await FriendRequest.findOne({
      $or: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    });
    if (!request) return res.json({ status: "none" });
    res.json({
      status:    request.status,
      requestId: request._id,
      isSender:  request.senderId.toString() === userId.toString(),
    });
  } catch (err) {
    console.error("friends/status error:", err);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// ── Remove / unfriend (delete accepted request record) ───────────────────────
router.delete("/friends/:userId/:friendId", async (req, res) => {
  try {
    const { userId, friendId } = req.params;
    await FriendRequest.findOneAndDelete({
      status: "accepted",
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
    });
    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error("friends DELETE error:", err);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

// ── Create or update profile ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { userId, username, photo, bio, interests } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    let profile = await Profile.findOne({ userId });
    if (profile) {
      if (username)          profile.username  = username;
      if (photo !== undefined) profile.photo   = photo;
      if (bio   !== undefined) profile.bio     = bio;
      if (interests !== undefined) profile.interests = interests;
      profile.updatedAt = new Date();
      await profile.save();
    } else {
      profile = new Profile({
        userId,
        username:  username || "User",
        photo:     photo     || null,
        bio:       bio       || "",
        interests: interests || "",
      });
      await profile.save();
    }
    res.json(profile);
  } catch (err) {
    console.error("profile POST error:", err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// ── Get profile by userId — MUST be the last GET route ───────────────────────
router.get("/:userId", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId });
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  } catch (err) {
    console.error("profile GET error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;