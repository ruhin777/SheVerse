const express = require("express");
const router = express.Router();
const { Booking, GuideBooking, Order, Payment, TravelBuddyMatch } = require("../models/schema");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ── CREATE PAYMENT INTENT ────────────────────────────────────
router.post("/create-intent", async (req, res) => {
  try {
    let { amount, currency = "usd", metadata } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });
    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    // Convert BDT to USD roughly (1 USD ~ 110 BDT) then to cents
    // Or just use minimum $0.50 for test
    const usdAmount = Math.max(Math.round((amount / 110) * 100), 50);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: usdAmount,
      currency: "usd",
      metadata: metadata || {},
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── CONFIRM HOTEL ────────────────────────────────────────────
router.post("/confirm-hotel", async (req, res) => {
  try {
    const { bookingId, stripePaymentId, userId, amount } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: "paid", stripePaymentId },
      { new: true }
    ).populate("hotelId");

    await Payment.create({
      userId, amount,
      paymentMethod: "stripe",
      stripePaymentId,
      paymentStatus: "paid",
      type: "hotel",
      referenceId: bookingId,
    });

    res.json({ message: "✅ Hotel payment confirmed!", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CONFIRM GUIDE ────────────────────────────────────────────
router.post("/confirm-guide", async (req, res) => {
  try {
    const { bookingId, stripePaymentId, userId, amount } = req.body;
    const booking = await GuideBooking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: "paid", stripePaymentId },
      { new: true }
    ).populate("guideId");

    await Payment.create({
      userId, amount,
      paymentMethod: "stripe",
      stripePaymentId,
      paymentStatus: "paid",
      type: "guide",
      referenceId: bookingId,
    });

    res.json({ message: "✅ Guide payment confirmed!", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CONFIRM ORDER ────────────────────────────────────────────
router.post("/confirm-order", async (req, res) => {
  try {
    const { orderId, stripePaymentId, userId, amount } = req.body;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: "paid", stripePaymentId },
      { new: true }
    );

    await Payment.create({
      userId, amount,
      paymentMethod: "stripe",
      stripePaymentId,
      paymentStatus: "paid",
      type: "order",
      referenceId: orderId,
    });

    res.json({ message: "✅ Order payment confirmed!", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CONFIRM TRIP ─────────────────────────────────────────────
router.post("/confirm-trip", async (req, res) => {
  try {
    const { matchId, stripePaymentId, userId, amount } = req.body;
    const match = await TravelBuddyMatch.findByIdAndUpdate(
      matchId,
      { status: "paid" },
      { new: true }
    );

    await Payment.create({
      userId, amount,
      paymentMethod: "stripe",
      stripePaymentId,
      paymentStatus: "paid",
      type: "trip",
      referenceId: matchId,
    });

    res.json({ message: "✅ Trip payment confirmed!", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;