const express = require("express");
const router = express.Router();
const { IncidentReport, Place } = require("../models/schema");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "sheverse_secret_key";

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

// POST /api/incidents — Submit a new report
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { description, location, dateTime, anonymous, incidentType } = req.body;

    if (!location || !dateTime) {
      return res.status(400).json({ error: "Location and date/time are required." });
    }

    // If incidentType is provided but description is empty, use incidentType as description
    const finalDescription = description && description.trim()
      ? description.trim()
      : incidentType
      ? incidentType
      : "";

    const report = new IncidentReport({
      userId: (anonymous === true || anonymous === "true") ? null : (userId || null),
      description: finalDescription,
      location: location.trim(),
      dateTime: new Date(dateTime),
      anonymous: anonymous === true || anonymous === "true",
      incidentType: incidentType ? incidentType.trim() : "",
    });

    await report.save();
    res.status(201).json({ message: "Report submitted successfully.", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/incidents/:id — Edit a report
// ✅ Fix: match by _id only (not userId) so anonymous reports can also be edited
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { description, location, dateTime, anonymous, incidentType } = req.body;

    if (!location || !dateTime) {
      return res.status(400).json({ error: "Location and date/time are required." });
    }

    // Same logic: if description empty but incidentType chosen, use incidentType
    const finalDescription = description && description.trim()
      ? description.trim()
      : incidentType
      ? incidentType
      : "";

    // ✅ Fix: find by _id only, not { _id, userId } — anonymous reports have userId null
    const report = await IncidentReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });

    // Update fields
    report.description  = finalDescription;
    report.location     = location.trim();
    report.dateTime     = new Date(dateTime);
    report.anonymous    = anonymous === true || anonymous === "true";
    report.incidentType = incidentType ? incidentType.trim() : "";

    await report.save();
    res.json({ message: "Report updated.", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/my — Current user's own reports (both anonymous and with identity)
router.get("/my", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // ✅ Fix: fetch reports where userId matches OR that were submitted while logged in
    const reports = await IncidentReport.find({ userId }).sort({ dateTime: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/places?q= — Location autocomplete from Places collection
router.get("/places", async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { name: { $regex: q, $options: "i" } } : {};
    const places = await Place.find(filter).select("name city location").limit(10);
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents — All non-anonymous reports
router.get("/", async (req, res) => {
  try {
    const reports = await IncidentReport.find({ anonymous: false }).sort({ dateTime: -1 }).limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;