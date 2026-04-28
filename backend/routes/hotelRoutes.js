const express = require("express");
const router = express.Router();
const { Hotel, Booking, Review } = require("../models/schema");

// ── POST /api/hotels/seed ────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Hotel.deleteMany();
    await Hotel.insertMany([
      {
        name: "Sea Pearl Beach Resort", location: "Cox's Bazar",
        pricePerNight: 8000, rating: 4.8, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["Pool", "WiFi", "Restaurant", "Spa"],
        description: "Luxury beachfront resort with stunning sea views and world-class amenities.",
        roomTypes: [
          { type: "Standard",  pricePerNight: 8000,  description: "Comfortable room with sea-facing window", amenities: ["WiFi", "AC", "TV"] },
          { type: "Deluxe",   pricePerNight: 12000, description: "Spacious room with private balcony and sea view", amenities: ["WiFi", "AC", "TV", "Minibar"] },
          { type: "Suite",    pricePerNight: 20000, description: "Luxury suite with living room and panoramic ocean view", amenities: ["WiFi", "AC", "TV", "Minibar", "Jacuzzi"] },
        ]
      },
      {
        name: "Long Beach Hotel", location: "Cox's Bazar",
        pricePerNight: 5500, rating: 4.6, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["WiFi", "Restaurant", "Beach Access"],
        description: "Comfortable hotel steps away from the world's longest sea beach.",
        roomTypes: [
          { type: "Standard", pricePerNight: 5500,  description: "Clean and cozy room with garden view", amenities: ["WiFi", "AC"] },
          { type: "Deluxe",  pricePerNight: 8000,  description: "Upgraded room with beach view balcony", amenities: ["WiFi", "AC", "Minibar"] },
          { type: "Suite",   pricePerNight: 14000, description: "Premium suite with full beach view", amenities: ["WiFi", "AC", "Minibar", "Bathtub"] },
        ]
      },
      {
        name: "Sajek Resort", location: "Sajek Valley",
        pricePerNight: 6000, rating: 4.7, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["WiFi", "Restaurant", "Mountain View"],
        description: "Cozy hilltop resort surrounded by clouds and nature in Sajek Valley.",
        roomTypes: [
          { type: "Standard", pricePerNight: 6000,  description: "Cozy room with valley view", amenities: ["WiFi", "AC"] },
          { type: "Deluxe",  pricePerNight: 9000,  description: "Spacious room with private deck and cloud view", amenities: ["WiFi", "AC", "Heater"] },
          { type: "Suite",   pricePerNight: 15000, description: "Luxury suite with panoramic hilltop view", amenities: ["WiFi", "AC", "Heater", "Fireplace"] },
        ]
      },
      {
        name: "Nilgiri Resort", location: "Bandarban",
        pricePerNight: 7000, rating: 4.8, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["WiFi", "Restaurant", "Trekking Guide", "View Deck"],
        description: "Premium hilltop resort with panoramic views of the Bandarban hill tracts.",
        roomTypes: [
          { type: "Standard", pricePerNight: 7000,  description: "Comfortable room with hill view", amenities: ["WiFi", "AC"] },
          { type: "Deluxe",  pricePerNight: 11000, description: "Upgraded room with panoramic deck", amenities: ["WiFi", "AC", "Minibar"] },
          { type: "Suite",   pricePerNight: 18000, description: "Premium suite with private terrace", amenities: ["WiFi", "AC", "Minibar", "Bathtub"] },
        ]
      },
      {
        name: "Sundarban Tiger Camp", location: "Sundarbans",
        pricePerNight: 9000, rating: 4.9, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["WiFi", "Restaurant", "Wildlife Tour", "Boat Rides"],
        description: "Eco-resort inside the Sundarbans with guided wildlife tours and boat rides.",
        roomTypes: [
          { type: "Standard", pricePerNight: 9000,  description: "Forest-facing eco room", amenities: ["WiFi", "Fan"] },
          { type: "Deluxe",  pricePerNight: 14000, description: "Premium room with river view", amenities: ["WiFi", "AC", "Minibar"] },
          { type: "Suite",   pricePerNight: 22000, description: "Luxury cabin with private deck over forest", amenities: ["WiFi", "AC", "Minibar", "Outdoor shower"] },
        ]
      },
      {
        name: "Dhaka Regency Hotel", location: "Dhaka",
        pricePerNight: 7500, rating: 4.5, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["Pool", "WiFi", "Restaurant", "Gym", "Spa"],
        description: "Five-star city hotel in the heart of Dhaka with premium business facilities.",
        roomTypes: [
          { type: "Standard", pricePerNight: 7500,  description: "Business room with city view", amenities: ["WiFi", "AC", "TV", "Work Desk"] },
          { type: "Deluxe",  pricePerNight: 12000, description: "Executive room with lounge access", amenities: ["WiFi", "AC", "TV", "Minibar", "Lounge"] },
          { type: "Suite",   pricePerNight: 20000, description: "Presidential suite with panoramic city view", amenities: ["WiFi", "AC", "TV", "Minibar", "Jacuzzi", "Butler"] },
        ]
      },
      {
        name: "Rangamati Lake View", location: "Rangamati",
        pricePerNight: 4500, rating: 4.4, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["WiFi", "Restaurant", "Lake View", "Boat Rides"],
        description: "Scenic lakeside resort with stunning views of Kaptai Lake.",
        roomTypes: [
          { type: "Standard", pricePerNight: 4500, description: "Cozy room with garden view", amenities: ["WiFi", "AC"] },
          { type: "Deluxe",  pricePerNight: 7000, description: "Lake-facing room with balcony", amenities: ["WiFi", "AC", "Minibar"] },
          { type: "Suite",   pricePerNight: 12000, description: "Luxury suite directly over the lake", amenities: ["WiFi", "AC", "Minibar", "Private Jetty"] },
        ]
      },
      {
        name: "Rose View Hotel", location: "Sylhet",
        pricePerNight: 5000, rating: 4.5, safetyVerified: true,
        image: "/images/hotels/hotel.jpg",
        amenities: ["Pool", "WiFi", "Restaurant", "Tea Garden Tours"],
        description: "Elegant hotel in Sylhet with easy access to tea gardens and waterfalls.",
        roomTypes: [
          { type: "Standard", pricePerNight: 5000,  description: "Garden-view room with tea estate access", amenities: ["WiFi", "AC"] },
          { type: "Deluxe",  pricePerNight: 8000,  description: "Spacious room with private balcony and tea garden view", amenities: ["WiFi", "AC", "Minibar"] },
          { type: "Suite",   pricePerNight: 14000, description: "Luxury suite with panoramic tea valley view", amenities: ["WiFi", "AC", "Minibar", "Bathtub"] },
        ]
      },
    ]);
    res.json({ message: "✅ Hotel seed data inserted with room types!" });
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

// ── GET /api/hotels/:id/reviews ──────────────────────────────
router.get("/:id/reviews", async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).select("reviews");
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    res.json(hotel.reviews || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hotels/:id/reviews ─────────────────────────────
router.post("/:id/reviews", async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    // Add review to embedded array
    hotel.reviews.push({ userId, userName, rating, comment });

    // Recalculate average rating
    const avg = hotel.reviews.reduce((sum, r) => sum + r.rating, 0) / hotel.reviews.length;
    hotel.rating = Math.round(avg * 10) / 10;

    await hotel.save();
    res.json({ message: "✅ Review submitted!", reviews: hotel.reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hotels/:id ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    res.json({ hotel, reviews: hotel.reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hotels/book ────────────────────────────────────
router.post("/book", async (req, res) => {
  try {
    const { userId, hotelId, checkIn, checkOut, roomType, pricePerNight } = req.body;
    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Hotel, check-in and check-out dates are required!" });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return res.status(400).json({ error: "Check-out must be after check-in!" });

    // Use selected room price or fall back to base price
    const selectedPrice = pricePerNight || hotel.pricePerNight;
    const totalPrice = nights * selectedPrice;

    const booking = new Booking({
      userId, hotelId, checkIn, checkOut,
      roomType: roomType || "Standard",
      pricePerNight: selectedPrice,
      paymentStatus: "pending",
      stripePaymentId: ""
    });
    await booking.save();
    res.json({ message: "✅ Booking created!", booking, hotel, nights, totalPrice });
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