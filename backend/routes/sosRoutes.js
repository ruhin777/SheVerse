const express = require("express");
const router = express.Router();
const { SOSAlert, TrustedContact, User } = require("../models/schema");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sheverse_secret_key";

// ── Auth helper ───────────────────────────────────────────────────────────────
function getDecoded(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.log("[SOS] Token verification failed:", err.message);
    return null;
  }
}

// Helper: extract userId regardless of which field the JWT uses
function getUserId(decoded) {
  if (!decoded) return null;
  return decoded.userId || decoded.id || decoded._id;
}

// Helper: strip all non-digits, then drop leading country code "880" or leading "0"
function normalizePhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/\D/g, "");
  if (p.startsWith("880") && p.length > 10) p = p.slice(3);
  if (p.startsWith("0")   && p.length > 9)  p = p.slice(1);
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: ALL named static routes MUST be declared before any /:id routes
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/sos/my ───────────────────────────────────────────────────────────
router.get("/my", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const userId = getUserId(decoded);

    const alerts = await SOSAlert.find({ senderId: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(alerts);
  } catch (err) {
    console.error("[SOS /my] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sos/active ───────────────────────────────────────────────────────
router.get("/active", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const userId = getUserId(decoded);

    const alert = await SOSAlert.findOne({
      senderId: userId,
      resolved: false,
    }).sort({ createdAt: -1 });

    res.json(alert || null);
  } catch (err) {
    console.error("[SOS /active] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sos/alerts ───────────────────────────────────────────────────────
// Returns unresolved SOS alerts from the last 24 h that were sent by someone
// whose phone number matches one of the current user's trusted contacts.
router.get("/alerts", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const userId = getUserId(decoded);

    // 1. Get all trusted contacts this user has saved
    const myContacts = await TrustedContact.find({ userId });
    const contactPhones = myContacts
      .map((c) => normalizePhone(c.phone))
      .filter((p) => p.length >= 7);   // ignore obviously-bad numbers

    if (contactPhones.length === 0) return res.json([]);

    // 2. Find registered users whose phone matches any saved contact
    const allOtherUsers = await User.find({ _id: { $ne: userId } }).select("_id name phone");

    const matchedUsers = allOtherUsers.filter((u) => {
      const n = normalizePhone(u.phone);
      return n.length >= 7 && contactPhones.includes(n);
    });

    if (matchedUsers.length === 0) return res.json([]);

    const matchedIds = matchedUsers.map((u) => u._id);

    // 3. Find recent unresolved SOS alerts from those users
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alerts = await SOSAlert.find({
      senderId:  { $in: matchedIds },
      resolved:  false,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    // 4. Attach sender phone to each alert for the "Call" button
    const result = alerts.map((alert) => {
      const sender = matchedUsers.find(
        (u) => u._id.toString() === alert.senderId.toString()
      );
      return {
        ...alert.toObject(),
        senderPhone: sender?.phone || "",
      };
    });

    res.json(result);
  } catch (err) {
    console.error("[SOS /alerts] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sos — Trigger / update a new SOS alert ─────────────────────────
router.post("/", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const userId = getUserId(decoded);

    const { latitude, longitude, message } = req.body;

    // Accept numbers, strings, or 0 — only reject truly missing/NaN values
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (latitude === undefined || latitude === null || latitude === "" || isNaN(latNum)) {
      return res.status(400).json({ error: "A valid latitude is required." });
    }
    if (longitude === undefined || longitude === null || longitude === "" || isNaN(lngNum)) {
      return res.status(400).json({ error: "A valid longitude is required." });
    }

    // Fetch the sender from the DB
    const sender = await User.findById(userId).select("name phone");
    if (!sender) {
      return res.status(404).json({ error: "User account not found. Please log in again." });
    }

    // Fetch all trusted contacts
    const contacts = await TrustedContact.find({ userId });
    const notifiedContacts = contacts.map((c) => ({ name: c.name, phone: c.phone }));

    // Upsert: if there is already an active alert, just update it
    const existing = await SOSAlert.findOne({ senderId: userId, resolved: false });
    if (existing) {
      existing.latitude         = latNum;
      existing.longitude        = lngNum;
      existing.message          = message?.trim() || "🚨 I need help! This is an emergency.";
      existing.createdAt        = new Date();
      existing.notifiedContacts = notifiedContacts;
      await existing.save();

      return res.status(200).json({
        message:          "SOS alert updated successfully.",
        alert:            existing,
        contactsNotified: notifiedContacts.length,
      });
    }

    // Create a brand-new alert
    const alert = new SOSAlert({
      senderId:         userId,
      senderName:       sender.name  || "SheVerse User",
      senderPhone:      sender.phone || "",
      latitude:         latNum,
      longitude:        lngNum,
      message:          message?.trim() || "🚨 I need help! This is an emergency.",
      notifiedContacts,
      resolved:         false,
    });

    await alert.save();

    res.status(201).json({
      message:          "SOS alert sent successfully.",
      alert,
      contactsNotified: notifiedContacts.length,
    });
  } catch (err) {
    console.error("[SOS POST] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sos/:id/respond ─────────────────────────────────────────────────
// Simple acknowledgement — no DB change needed for now
router.post("/:id/respond", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    res.json({ message: "Response recorded." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/sos/:id/resolve ────────────────────────────────────────────────
router.patch("/:id/resolve", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const userId = getUserId(decoded);

    const alert = await SOSAlert.findOneAndUpdate(
      { _id: req.params.id, senderId: userId },
      { resolved: true },
      { new: true }
    );

    if (!alert) return res.status(404).json({ error: "Alert not found." });
    res.json({ message: "Alert resolved.", alert });
  } catch (err) {
    console.error("[SOS /resolve] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;