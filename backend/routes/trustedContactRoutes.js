const express = require("express");
const router = express.Router();
const { TrustedContact } = require("../models/schema");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sheverse_secret_key";

// 🔐 Middleware to get user
function getUserId(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

// ── ADD CONTACT ─────────────────────────
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, phone } = req.body;

    const contact = new TrustedContact({ userId, name, phone });
    await contact.save();

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET CONTACTS ───────────────────────
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const contacts = await TrustedContact.find({ userId });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE CONTACT ─────────────────────
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);

    const updated = await TrustedContact.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE CONTACT ─────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);

    await TrustedContact.findOneAndDelete({
      _id: req.params.id,
      userId
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;