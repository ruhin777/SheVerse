const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path"); 
const http        = require("http");
const { Server }  = require("socket.io");

const authRoutes           = require("./routes/authRoutes");
const placeRoutes          = require("./routes/placeRoutes");
const tripRoutes           = require("./routes/tripRoutes");
const guideRoutes          = require("./routes/guideRoutes");
const hotelRoutes          = require("./routes/hotelRoutes");
const marketplaceRoutes    = require("./routes/marketplaceRoutes");
const trustedContactRoutes = require("./routes/trustedContactRoutes");
const menstrualRoutes      = require("./routes/menstrualRoutes");
const articleRoutes        = require("./routes/articleRoutes");
const lifestyleRoutes      = require("./routes/lifestyleRoutes");
const exerciseRoutes       = require("./routes/exerciseRoutes");
const aibotRoutes          = require("./routes/aibotRoutes");
const postRoutes           = require("./routes/postRoutes");
const groupRoutes          = require("./routes/groupRoutes");
const profileRoutes        = require("./routes/profileRoutes");
const messageRoutes        = require("./routes/messageRoutes");
const liveLocationRoutes   = require("./routes/liveLocationRoutes");
const incidentRoutes       = require("./routes/incidentRoutes");
const paymentRoutes        = require("./routes/paymentRoutes");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ── Single MongoDB connection ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ── Routes ──
app.use("/api/places",      placeRoutes);
app.use("/api/trips",       tripRoutes);
app.use("/api/auth",        authRoutes);
app.use("/api/guides",      guideRoutes);
app.use("/api/hotels",      hotelRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/period",      menstrualRoutes);
app.use("/api/articles",    articleRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/lifestyle",   lifestyleRoutes);
app.use("/api/exercises",   exerciseRoutes);
app.use("/api/aibot",       aibotRoutes);

app.get("/", (req, res) => res.send("SheVerse API running ✅"));

app.listen(process.env.PORT, () => {
  console.log("🚀 Server running on port " + process.env.PORT);
});

