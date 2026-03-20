const express = require("express");
const router = express.Router();
const { Hotel, Booking, Review } = require("../models/schema");

// ── POST /api/hotels/seed ────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Hotel.deleteMany();
    await Hotel.insertMany([
      { name: "Sea Pearl Beach Resort", location: "Cox's Bazar", pricePerNight: 8000, rating: 4.8, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["Pool", "WiFi", "Restaurant", "Spa"], description: "Luxury beachfront resort with stunning sea views and world-class amenities." },
      { name: "Long Beach Hotel", location: "Cox's Bazar", pricePerNight: 5500, rating: 4.6, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["WiFi", "Restaurant", "Beach Access"], description: "Comfortable hotel steps away from the world's longest sea beach." },
      { name: "Sajek Resort", location: "Sajek Valley", pricePerNight: 6000, rating: 4.7, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["WiFi", "Restaurant", "Mountain View"], description: "Cozy hilltop resort surrounded by clouds and nature in Sajek Valley." },
      { name: "Nilgiri Resort", location: "Bandarban", pricePerNight: 7000, rating: 4.8, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["WiFi", "Restaurant", "Trekking Guide", "View Deck"], description: "Premium hilltop resort with panoramic views of the Bandarban hill tracts." },
      { name: "Sundarban Tiger Camp", location: "Sundarbans", pricePerNight: 9000, rating: 4.9, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["WiFi", "Restaurant", "Wildlife Tour", "Boat Rides"], description: "Eco-resort inside the Sundarbans with guided wildlife tours and boat rides." },
      { name: "Dhaka Regency Hotel", location: "Dhaka", pricePerNight: 7500, rating: 4.5, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["Pool", "WiFi", "Restaurant", "Gym", "Spa"], description: "Five-star city hotel in the heart of Dhaka with premium business facilities." },
      { name: "Rangamati Lake View", location: "Rangamati", pricePerNight: 4500, rating: 4.4, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["WiFi", "Restaurant", "Lake View", "Boat Rides"], description: "Scenic lakeside resort with stunning views of Kaptai Lake." },
      { name: "Rose View Hotel", location: "Sylhet", pricePerNight: 5000, rating: 4.5, safetyVerified: true, image: "/images/hotels/hotel.jpg", amenities: ["Pool", "WiFi", "Restaurant", "Tea Garden Tours"], description: "Elegant hotel in Sylhet with easy access to tea gardens and waterfalls." },
    ]);
    res.json({ message: "✅ Hotel seed data inserted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hotels/all ──────────────────────────────────────
router.get("/all", async (req, res) => {
  try {
    const { location, minPrice, maxPrice } = req.query;
    const filter = {};
    if (location) filter.location = new RegExp(location, "i");
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }
    const hotels = await Hotel.find(filter).sort({ rating: -1 });
    res.json(hotels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hotels/:id ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    const reviews = await Review.find({ hotelId: req.params.id })
      .populate("userId", "name");
    res.json({ hotel, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hotels/book ────────────────────────────────────
router.post("/book", async (req, res) => {
  try {
    const { userId, hotelId, checkIn, checkOut } = req.body;
    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Hotel, check-in and check-out dates are required!" });
    }
    // Calculate total price
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return res.status(400).json({ error: "Check-out must be after check-in!" });
    const totalPrice = nights * hotel.pricePerNight;

    const booking = new Booking({
      userId,
      hotelId,
      checkIn,
      checkOut,
      paymentStatus: "pending",
      stripePaymentId: ""
    });
    await booking.save();
    res.json({ message: "✅ Booking created!", booking, hotel, nights, totalPrice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hotels/bookings/:userId ─────────────────────────
router.get("/bookings/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate("hotelId")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hotels/review ──────────────────────────────────
router.post("/review", async (req, res) => {
  try {
    const { userId, hotelId, rating, comment } = req.body;
    const review = new Review({ userId, hotelId, rating, comment });
    await review.save();
    const reviews = await Review.find({ hotelId });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Hotel.findByIdAndUpdate(hotelId, { rating: Math.round(avg * 10) / 10 });
    res.json({ message: "✅ Review submitted!", review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;