const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { User } = require("../models/schema");


const JWT_SECRET = process.env.JWT_SECRET || "sheverse_secret_key";
 
// ── Profile Schema (auto-create on register) ──────────────────
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
// ── POST /api/auth/register ──────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!phone || !phone.trim()) return res.status(400).json({ error: "Phone number is required." });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered!" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, phone });
    await user.save();

        // ── AUTO-CREATE PROFILE so search, messaging, friends all work immediately ──
    const existingProfile = await Profile.findOne({ userId: user._id });
    if (!existingProfile) {
      const profile = new Profile({ userId: user._id, username: name });
      await profile.save();
    }

    const token = jwt.sign({ userId: user._id, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "✅ Registered!", token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email not found!" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Wrong password!" });
    const token = jwt.sign({ userId: user._id, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "✅ Login successful!", token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;