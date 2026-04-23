const express = require("express");
const router = express.Router();
const { LiveLocation, TrustedContact, User } = require("../models/schema");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sheverse_secret_key";

function getDecoded(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

// POST /api/live-location — Update (upsert) my live location
router.post("/", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const { latitude, longitude, sharing } = req.body;

    if (sharing === false) {
      // Stop sharing — delete the record
      await LiveLocation.findOneAndDelete({ userId: decoded.userId });
      return res.json({ message: "Stopped sharing." });
    }

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: "Coordinates required." });
    }

    // Upsert — one record per user
    const loc = await LiveLocation.findOneAndUpdate(
      { userId: decoded.userId },
      {
        userId: decoded.userId,
        latitude,
        longitude,
        sharing: true,
        timestamp: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(loc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/live-location/my — My current sharing status
router.get("/my", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const loc = await LiveLocation.findOne({ userId: decoded.userId });
    res.json(loc || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/live-location/contacts — Locations of my trusted contacts who are sharing
router.get("/contacts", async (req, res) => {
  try {
    const decoded = getDecoded(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    // Get this user's trusted contacts
    const myContacts = await TrustedContact.find({ userId: decoded.userId });

    // Filter out empty/null phones to prevent cross-account leaking
    const phones = myContacts
      .map(c => c.phone)
      .filter(p => p && p.trim() !== "");

    // If no valid phones, return empty immediately
    if (phones.length === 0) return res.json([]);

    // Find registered users whose phone matches AND exclude self
    const users = await User.find({
      phone: { $in: phones },
      _id: { $ne: decoded.userId },
    }).select("_id name phone");

    if (users.length === 0) return res.json([]);

    const userIds = users.map(u => u._id);

    // Only return locations updated within last 2 minutes
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    const locations = await LiveLocation.find({
      userId: { $in: userIds },
      sharing: true,
      timestamp: { $gte: twoMinAgo },
    });

    // Merge user info into each location record
    const result = locations.map(loc => {
      const user = users.find(u => u._id.toString() === loc.userId.toString());
      return {
        _id: loc._id,
        userId: loc.userId,
        name: user?.name || "Unknown",
        phone: user?.phone || "",
        latitude: loc.latitude,
        longitude: loc.longitude,
        timestamp: loc.timestamp,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;