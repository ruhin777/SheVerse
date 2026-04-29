const express = require("express");
const router = express.Router();
const { Product, Order, Payment } = require("../models/schema");

// ── GET /api/marketplace/products ───────────────────────────
router.get("/products", async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/marketplace/seed ───────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Product.deleteMany();
    await Product.insertMany([
      { name: "Personal Alarm",        price: 450,  quantity: 100, type: "Safety",      description: "130dB emergency alarm with LED flashlight. Compact and easy to carry.",        image: "" },
      { name: "Safety Whistle",        price: 150,  quantity: 200, type: "Safety",      description: "Loud 120dB whistle for emergency signaling. Lightweight and durable.",          image: "" },
      { name: "Door Stop Alarm",       price: 650,  quantity: 50,  type: "Safety",      description: "Portable door alarm for hotel rooms. Easy to use, no installation required.", image: "" },
      { name: "Pepper Spray",          price: 550,  quantity: 80,  type: "Safety",      description: "Compact self-defense pepper spray. Legal and effective.",                      image: "" },
      { name: "Power Bank 20000mAh",   price: 1800, quantity: 60,  type: "Electronics", description: "High-capacity power bank to keep your devices charged on the go.",             image: "" },
      { name: "Solar Charger",         price: 1200, quantity: 40,  type: "Electronics", description: "Portable solar panel charger for off-grid adventures.",                        image: "" },
      { name: "GPS Tracker",           price: 2500, quantity: 30,  type: "Electronics", description: "Compact GPS tracker for real-time location sharing with trusted contacts.",     image: "" },
      { name: "Travel Neck Pillow",    price: 600,  quantity: 90,  type: "Comfort",     description: "Memory foam travel pillow for comfortable journeys.",                           image: "" },
      { name: "Compression Packing Cubes", price: 800, quantity: 70, type: "Gear",    description: "Set of 4 packing cubes to organize your luggage efficiently.",                  image: "" },
      { name: "Anti-Theft Backpack",   price: 3500, quantity: 25,  type: "Gear",        description: "Slash-proof, lockable backpack with hidden compartments.",                     image: "" },
    ]);
    res.json({ message: "✅ Marketplace seed data inserted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/marketplace/order ─────────────────────────────
// ✅ FIXED: items are embedded inside Order document directly
router.post("/order", async (req, res) => {
  try {
    const { userId, items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty!" });
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Build embedded items with productId reference
    const embeddedItems = items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    const order = await Order.create({
      userId,
      items: embeddedItems,
      totalPrice,
      paymentStatus: "pending",
    });

    // Reduce stock quantities
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity }
      });
    }

    res.json({ message: "✅ Order created!", order, totalPrice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/marketplace/orders/:userId ─────────────────────
// ✅ FIXED: populate items.productId so the orders page renders correctly
router.get("/orders/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate("items.productId")   // ✅ populate embedded items
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;