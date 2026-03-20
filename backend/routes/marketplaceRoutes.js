const express = require("express");
const router = express.Router();
const { Product, Order, OrderItem } = require("../models/schema");

// ── POST /api/marketplace/seed ───────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Product.deleteMany();
    await Product.insertMany([
      { name: "Personal Safety Alarm", price: 350, quantity: 50, type: "Safety", description: "Loud 120dB alarm to deter attackers. Compact and easy to carry.", image: "/images/marketplace/safety-alarm.jpg" },
      { name: "First Aid Kit", price: 650, quantity: 30, type: "Safety", description: "Complete travel first aid kit with bandages, antiseptic and medications.", image: "/images/marketplace/first-aid.jpg" },
      { name: "Travel Door Lock", price: 450, quantity: 40, type: "Safety", description: "Portable door lock for extra security in hotels and guesthouses.", image: "/images/marketplace/door-lock.jpg" },
      { name: "Pepper Spray", price: 280, quantity: 60, type: "Safety", description: "Legal pepper spray for personal protection. Easy to use.", image: "/images/marketplace/pepper-spray.jpg" },
      { name: "RFID Blocking Wallet", price: 520, quantity: 35, type: "Safety", description: "Protects your cards from digital theft and unauthorized scanning.", image: "/images/marketplace/rfid-wallet.jpg" },
      { name: "Portable Charger 10000mAh", price: 1200, quantity: 25, type: "Electronics", description: "Stay connected anywhere. Fast charging power bank for travel.", image: "/images/marketplace/power-bank.jpg" },
      { name: "Travel Neck Pillow", price: 380, quantity: 45, type: "Comfort", description: "Memory foam neck pillow for comfortable long journeys.", image: "/images/marketplace/neck-pillow.jpg" },
      { name: "Waterproof Backpack", price: 1800, quantity: 20, type: "Gear", description: "Lightweight waterproof backpack perfect for hill treks and beach trips.", image: "/images/marketplace/backpack.jpg" },
      { name: "Travel Locks Set (3pcs)", price: 320, quantity: 55, type: "Safety", description: "TSA approved combination locks for luggage security.", image: "/images/marketplace/locks.jpg" },
      { name: "Emergency Whistle", price: 150, quantity: 100, type: "Safety", description: "Loud emergency whistle. Essential safety tool for solo travelers.", image: "/images/marketplace/whistle.jpg" },
    ]);
    res.json({ message: "✅ Marketplace seed data inserted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/marketplace/products ───────────────────────────
router.get("/products", async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const products = await Product.find(filter).sort({ type: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/marketplace/order ──────────────────────────────
router.post("/order", async (req, res) => {
  try {
    const { userId, items } = req.body;
    // items = [{ productId, quantity, price }]
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty!" });
    }
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create order
    const order = new Order({
      userId,
      totalPrice,
      paymentStatus: "pending",
      orderDate: new Date()
    });
    await order.save();

    // Create order items
    for (const item of items) {
      await OrderItem.create({
        orderId: order._id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      });
      // Reduce product quantity
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity }
      });
    }

    res.json({ message: "✅ Order placed!", order, totalPrice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/marketplace/orders/:userId ──────────────────────
router.get("/orders/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .sort({ orderDate: -1 });

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id })
          .populate("productId");
        return { ...order.toObject(), items };
      })
    );
    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;