const express = require("express");
const router = express.Router();
const { TripPlan, TravelBuddyMatch, Place } = require("../models/schema");

// ── POST /api/trips/create ───────────────────────────────────
router.post("/create", async (req, res) => {
  try {
    const tripData = { ...req.body };
    // Remove userId if invalid to avoid cast errors
    if (!tripData.userId || tripData.userId.length !== 24) {
      delete tripData.userId;
    }

    const trip = new TripPlan(tripData);
    await trip.save();

    // Auto-match with similar trips same destination + travelType
    const matches = await TripPlan.find({
      _id: { $ne: trip._id },
      destination: new RegExp(trip.destination, "i"),
      travelType: trip.travelType,
    }).limit(5);

    res.json({ trip, matchesFound: matches.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trips/all ───────────────────────────────────────
router.get("/all", async (req, res) => {
  try {
    const trips = await TripPlan.find()
      .populate("userId", "name profilePhoto")
      .sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trips/my/:userId ────────────────────────────────
router.get("/my/:userId", async (req, res) => {
  try {
    const trips = await TripPlan.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trips/matches/:tripId ───────────────────────────
router.get("/matches/:tripId", async (req, res) => {
  try {
    const matches = await TravelBuddyMatch.find({ tripId: req.params.tripId })
      .populate("matchedUserId", "name profilePhoto bio interests");
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/trips/recommendations/:destination ──────────────
router.get("/recommendations/:destination", async (req, res) => {
  try {
    const places = await Place.find({
      $or: [
        { city: new RegExp(req.params.destination, "i") },
        { name: new RegExp(req.params.destination, "i") },
        { tags: new RegExp(req.params.destination, "i") },
      ]
    }).sort({ rating: -1 }).limit(6);
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/trips/:id ────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await TripPlan.findByIdAndDelete(req.params.id);
    await TravelBuddyMatch.deleteMany({ tripId: req.params.id });
    res.json({ message: "Trip deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/trips/seed ─────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await TripPlan.deleteMany();
    await TravelBuddyMatch.deleteMany();

    await TripPlan.insertMany([
      { destination: "Cox's Bazar",  category: "beach",     startDate: new Date("2025-03-01"), endDate: new Date("2025-03-05"), budget: 5000,  travelType: "group", teamSize: 4, preferences: "budget friendly, beach activities" },
      { destination: "Cox's Bazar",  category: "beach",     startDate: new Date("2025-03-10"), endDate: new Date("2025-03-14"), budget: 7000,  travelType: "group", teamSize: 3, preferences: "photography, sea food" },
      { destination: "Sajek Valley", category: "hill",      startDate: new Date("2025-04-10"), endDate: new Date("2025-04-14"), budget: 8000,  travelType: "group", teamSize: 3, preferences: "photography, trekking" },
      { destination: "Sajek Valley", category: "hill",      startDate: new Date("2025-04-15"), endDate: new Date("2025-04-18"), budget: 6000,  travelType: "solo",  teamSize: 1, preferences: "nature, relaxing" },
      { destination: "Bandarban",    category: "hill",      startDate: new Date("2025-05-01"), endDate: new Date("2025-05-04"), budget: 6000,  travelType: "solo",  teamSize: 1, preferences: "adventure, hiking" },
      { destination: "Sundarbans",   category: "other",     startDate: new Date("2025-06-15"), endDate: new Date("2025-06-18"), budget: 10000, travelType: "group", teamSize: 5, preferences: "wildlife, nature" },
      { destination: "Dhaka",        category: "historical",startDate: new Date("2025-02-20"), endDate: new Date("2025-02-22"), budget: 3000,  travelType: "solo",  teamSize: 1, preferences: "history, food" },
    ]);

    res.json({ message: "✅ Trip seed data inserted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;