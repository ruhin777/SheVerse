const express = require("express");
const router = express.Router();
const { Guide, GuideBooking, Review } = require("../models/schema");

// ── POST /api/guides/seed ────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Guide.deleteMany();
    await Guide.insertMany([
      { name: "Fatema Akter",    destination: "Cox's Bazar",  language: "Bengali, English", rating: 4.8, verified: true, pricePerDay: 1500, contact: "01712345678", image: "/images/guides/guide.png",  bio: "Experienced coastal guide with 5 years in Cox's Bazar. Specializes in beach tours and seafood spots." },
      { name: "Nusrat Jahan",   destination: "Sajek Valley",  language: "Bengali, English", rating: 4.7, verified: true, pricePerDay: 1800, contact: "01812345678", image: "/images/guides/guide.png",  bio: "Hill tracts expert. Knows every trail in Sajek and connects tourists with local tribal culture." },
      { name: "Sumaiya Islam",  destination: "Bandarban",     language: "Bengali",          rating: 4.6, verified: true, pricePerDay: 1600, contact: "01912345678", image: "/images/guides/guide.png",  bio: "Adventure guide specializing in Bandarban trekking routes and waterfall exploration." },
      { name: "Rashida Begum",  destination: "Sundarbans",    language: "Bengali, English", rating: 4.9, verified: true, pricePerDay: 2000, contact: "01612345678", image: "/images/guides/guide.png",  bio: "Wildlife expert and Sundarbans specialist. Has guided over 200 nature tours safely." },
      { name: "Tahmina Khatun", destination: "Dhaka",         language: "Bengali, English, Hindi", rating: 4.5, verified: true, pricePerDay: 1200, contact: "01512345678", image: "/images/guides/guide.png", bio: "Dhaka city guide. Expert in historical sites, food tours and cultural experiences." },
      { name: "Sharmin Akter",  destination: "Rangamati",     language: "Bengali",          rating: 4.7, verified: true, pricePerDay: 1700, contact: "01312345678", image: "/images/guides/guide.png",  bio: "Lake and hill specialist in Rangamati. Knows the best scenic spots and local restaurants." },
      { name: "Lamia Hassan",   destination: "Cox's Bazar",   language: "Bengali, English", rating: 4.6, verified: true, pricePerDay: 1400, contact: "01412345678", image: "/images/guides/guide.png",  bio: "Beach and marine life expert. Offers snorkeling and boat tour guidance." },
      { name: "Nadia Sultana",  destination: "Sylhet",        language: "Bengali, English", rating: 4.8, verified: true, pricePerDay: 1600, contact: "01112345678", image: "/images/guides/guide.png",  bio: "Tea garden and waterfall expert in Sylhet. Fluent in English for international tourists." },
    ]);
    res.json({ message: "✅ Guide seed data inserted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/guides/all ──────────────────────────────────────
router.get("/all", async (req, res) => {
  try {
    const { destination, verified } = req.query;
    const filter = {};
    if (destination) filter.destination = new RegExp(destination, "i");
    if (verified) filter.verified = true;
    const guides = await Guide.find(filter).sort({ rating: -1 });
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/guides/:id ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const guide = await Guide.findById(req.params.id);
    if (!guide) return res.status(404).json({ error: "Guide not found" });
    const reviews = await Review.find({ guideId: req.params.id })
      .populate("userId", "name");
    res.json({ guide, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/guides/book ────────────────────────────────────
router.post("/book", async (req, res) => {
  try {
    const { userId, guideId, bookingDate } = req.body;
    if (!guideId || !bookingDate) {
      return res.status(400).json({ error: "Guide and booking date are required!" });
    }
    const booking = new GuideBooking({
      userId,
      guideId,
      bookingDate,
      paymentStatus: "pending"
    });
    await booking.save();
    const guide = await Guide.findById(guideId);
    res.json({ message: "✅ Booking request sent!", booking, guide });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/guides/bookings/:userId ─────────────────────────
router.get("/bookings/:userId", async (req, res) => {
  try {
    const bookings = await GuideBooking.find({ userId: req.params.userId })
      .populate("guideId")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/guides/review ──────────────────────────────────
router.post("/review", async (req, res) => {
  try {
    const { userId, guideId, rating, comment } = req.body;
    const review = new Review({ userId, guideId, rating, comment });
    await review.save();
    // Update guide average rating
    const reviews = await Review.find({ guideId });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Guide.findByIdAndUpdate(guideId, { rating: Math.round(avg * 10) / 10 });
    res.json({ message: "✅ Review submitted!", review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;