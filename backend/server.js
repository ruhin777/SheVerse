const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path"); // ✅ ADDED

const placeRoutes       = require("./routes/placeRoutes");
const tripRoutes        = require("./routes/tripRoutes");
const authRoutes        = require("./routes/authRoutes");
const guideRoutes       = require("./routes/guideRoutes");
const hotelRoutes       = require("./routes/hotelRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes"); 
const trustedContactRoutes = require("./routes/trustedContactRoutes"); // ADD

const menstrualRoutes   = require("./routes/menstrualRoutes");
const articleRoutes     = require("./routes/articleRoutes");
const lifestyleRoutes   = require("./routes/lifestyleRoutes");
const exerciseRoutes    = require("./routes/exerciseRoutes");
const aibotRoutes       = require("./routes/aibotRoutes");

const postRoutes        = require("./routes/postRoutes");       // ADD for posts

const incidentRoutes    = require("./routes/incidentRoutes");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ── Single MongoDB connection ──
// ✅ ADDED: Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
app.use("/api/contacts", trustedContactRoutes);// ADD
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/period",      menstrualRoutes);
app.use("/api/articles",    articleRoutes);
app.use("/api/lifestyle",   lifestyleRoutes);
app.use("/api/exercises",   exerciseRoutes);
app.use("/api/aibot",       aibotRoutes);
app.use("/api/incidents", incidentRoutes);

app.get("/", (req, res) => res.send("SheVerse API running ✅"));
app.use("/api/posts",       postRoutes);       // ADD for posts

app.get("/", (req, res) => res.send("SheVerse API running"));

app.listen(process.env.PORT, () => {
  console.log("🚀 Server running on port " + process.env.PORT);
});

