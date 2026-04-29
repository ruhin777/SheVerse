const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path"); 

const http        = require("http");
const { Server }  = require("socket.io");


const authRoutes        = require("./routes/authRoutes");   
const groupRoutes = require("./routes/groupRoutes");
const profileRoutes = require("./routes/profileRoutes")
const messageRoutes        = require("./routes/messageRoutes");
const liveLocationRoutes = require("./routes/liveLocationRoutes");
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
const incidentRoutes       = require("./routes/incidentRoutes");
const paymentRoutes        = require("./routes/paymentRoutes");

const app = express();

// ── NEW: wrap express app with http.Server so Socket.io can attach ──
const httpServer = http.createServer(app);
 
// ── NEW: create Socket.io server, allow React dev server origin ──
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ── Single MongoDB connection ──
// ✅ ADDED: Serve uploaded images
//app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Serve uploaded images


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


////////////////////////////////////////////////////////////////////////////////////////////
// ── Message model (needed for saving inside Socket.io events) ──
const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content:    { type: String, required: true },
  timestamp:  { type: Date, default: Date.now },
});
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
 
// ════════════════════════════════════════════════════════
//  SOCKET.IO — Real-Time Chat Logic
//
//  How it works:
//  1. When a user opens the app, the frontend connects to
//     Socket.io and emits "register" with their userId.
//  2. Server stores userId → socketId in a Map.
//  3. When user A sends a message to user B, frontend emits
//     "sendMessage" with { senderId, receiverId, content }.
//  4. Server saves it to MongoDB, then emits "receiveMessage"
//     to BOTH the sender's socket and the receiver's socket
//     so both see the message instantly.
// ════════════════════════════════════════════════════════
 
// Map: userId (string) → socketId
const onlineUsers = new Map();
 
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);
 
  // ── Register: user tells server their userId ──
  socket.on("register", (userId) => {
    onlineUsers.set(userId.toString(), socket.id);
    console.log(`👤 User ${userId} registered with socket ${socket.id}`);
  });
 
  // ── Send Message ──
  socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
    try {
      // 1. Save to MongoDB
      const message = new Message({
        senderId,
        receiverId,
        content: content.trim(),
      });
      await message.save();
 
      const payload = {
        _id:        message._id,
        senderId,
        receiverId,
        content:    message.content,
        timestamp:  message.timestamp,
      };
 
      // 2. Emit to receiver if they are online
      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", payload);
      }
 
      // 3. Emit back to sender (so their own UI updates instantly)
      socket.emit("receiveMessage", payload);
 
    } catch (err) {
      console.error("sendMessage error:", err);
      socket.emit("messageError", { error: "Failed to send message" });
    }
  });
 
  // ── Disconnect ──
  socket.on("disconnect", () => {
    // Remove user from online map
    for (const [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(userId);
        console.log(`👋 User ${userId} disconnected`);
        break;
      }
    }
  });
});


////////////////////////////////////////////////////////////////////////////////////////////


// ── Routes ──
app.use("/api/places",      placeRoutes);
app.use("/api/trips",       tripRoutes);
app.use("/api/auth",        authRoutes);
app.use("/api/guides",      guideRoutes);
app.use("/api/hotels",      hotelRoutes);
app.use("/api/marketplace", marketplaceRoutes); 
app.use("/api/contacts", trustedContactRoutes);// ADD

app.use("/api/period",      menstrualRoutes);
app.use("/api/articles",    articleRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/lifestyle",   lifestyleRoutes);
app.use("/api/exercises",   exerciseRoutes);
app.use("/api/aibot",       aibotRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/live-location", liveLocationRoutes);

app.use("/api/posts",       postRoutes);       // ADD for posts
app.use("/api/groups", groupRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages",    messageRoutes);
app.use("/api/payment",     paymentRoutes);
app.get("/", (req, res) => res.send("SheVerse API running"));
// ── NEW: use httpServer.listen instead of app.listen ──
httpServer.listen(process.env.PORT, () => {
  console.log("🚀 Server running on port " + process.env.PORT);
});

//app.listen(process.env.PORT, () => {
//  console.log("🚀 Server running on port " + process.env.PORT);
//});


