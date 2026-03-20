const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const placeRoutes       = require("./routes/placeRoutes");
const tripRoutes        = require("./routes/tripRoutes");
const authRoutes        = require("./routes/authRoutes");
const guideRoutes       = require("./routes/guideRoutes");
const hotelRoutes       = require("./routes/hotelRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes"); // ADD

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.use("/api/places",      placeRoutes);
app.use("/api/trips",       tripRoutes);
app.use("/api/auth",        authRoutes);
app.use("/api/guides",      guideRoutes);
app.use("/api/hotels",      hotelRoutes);
app.use("/api/marketplace", marketplaceRoutes); // ADD

app.get("/", (req, res) => res.send("SheVerse API running"));

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});