const express = require("express");
const router = express.Router();
const { Guide, GuideBooking } = require("../models/schema");

// ── POST /api/guides/seed ────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Guide.deleteMany();
    await Guide.insertMany([
      { name: "Fatima Akter",   destination: "Cox's Bazar",  language: "Bengali, English", rating: 4.8, verified: true,  pricePerDay: 1500, contact: "01711-000001", image: "https://randomuser.me/api/portraits/women/1.jpg",  bio: "Expert in Cox's Bazar beach tours and local seafood spots." },
      { name: "Nadia Islam",    destination: "Sajek Valley",  language: "Bengali",          rating: 4.7, verified: true,  pricePerDay: 1800, contact: "01711-000002", image: "https://randomuser.me/api/portraits/women/2.jpg",  bio: "Trekking specialist with 5 years experience in Sajek." },
      { name: "Marium Begum",   destination: "Bandarban",     language: "Bengali, Chakma",  rating: 4.9, verified: true,  pricePerDay: 2000, contact: "01711-000003", image: "https://randomuser.me/api/portraits/women/3.jpg",  bio: "Fluent in local tribal languages, expert hill guide." },
      { name: "Sumaiya Hasan",  destination: "Sundarbans",    language: "Bengali, English", rating: 4.6, verified: true,  pricePerDay: 2200, contact: "01711-000004", image: "https://randomuser.me/api/portraits/women/4.jpg",  bio: "Wildlife enthusiast and certified Sundarbans guide." },
      { name: "Roksana Parvin", destination: "Dhaka",         language: "Bengali, English", rating: 4.5, verified: true,  pricePerDay: 1200, contact: "01711-000005", image: "https://randomuser.me/api/portraits/women/5.jpg",  bio: "History expert with deep knowledge of Dhaka's heritage." },
      { name: "Tania Chowdhury",destination: "Rangamati",     language: "Bengali",          rating: 4.7, verified: false, pricePerDay: 1600, contact: "01711-000006", image: "https://randomuser.me/api/portraits/women/6.jpg",  bio: "Lake tour specialist, knows every corner of Kaptai Lake." },
      { name: "Sabrina Khanam", destination: "Sylhet",        language: "Bengali, Sylheti", rating: 4.8, verified: true,  pricePerDay: 1400, contact: "01711-000007", image: "https://randomuser.me/api/portraits/women/7.jpg",  bio: "Tea garden and waterfall expert in greater Sylhet." },
    ]);
    res.json({ message: "✅ Guide seed data inserted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/guides/all ──────────────────────────────────────
router.get("/all", async (req, res) => {
  try {
    const filter = {};
    if (req.query.destination) filter.destination = req.query.destination;
    const guides = await Guide.find(filter);
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/guides/book ────────────────────────────────────
// ✅ FIXED: returns booking with populated guideId for payment flow
router.post("/book", async (req, res) => {
  try {
    const { userId, guideId, bookingDate } = req.body;
    if (!userId || !guideId || !bookingDate) {
      return res.status(400).json({ error: "userId, guideId and bookingDate are required!" });
    }

    const booking = await GuideBooking.create({
      userId,
      guideId,
      bookingDate,
      paymentStatus: "pending",
    });

    // Populate to return guide info to the frontend
    const populated = await GuideBooking.findById(booking._id).populate("guideId");

    res.json({ message: "✅ Booking created!", booking: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/guides/bookings/:userId ─────────────────────────
router.get("/bookings/:userId", async (req, res) => {
  try {
    const bookings = await GuideBooking.find({ userId: req.params.userId })
      .populate("guideId")
      .sort({ bookingDate: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;