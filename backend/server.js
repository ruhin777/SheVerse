const {
  User,
  TrustedContact,
  SOSAlert,
  LiveLocation,
  IncidentReport,
  EmergencyService,
  PeriodCycle,
  SymptomLog,
  BMIRecord,
  TodoTask,
  Exercise,
  ExerciseLog,
  Article,
  Bookmark,
  ChatBotQuery,
  Place,
  Restaurant,
  Recommendation,
  Guide,
  GuideBooking,
  Hotel,
  TripPlan,
  TravelBuddyMatch,
  Booking,
  Product,
  Order,
  OrderItem,
  Payment,
  Review,
  Post,
  Reaction,
  Comment,
  Group,
  GroupMember,
  GroupPost,
  FriendRequest,
  Message
} = require("./models/schema");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

app.get("/", (req,res)=>{
res.send("SheVerse API running");
});

app.listen(process.env.PORT, ()=>{
console.log("Server running on port " + process.env.PORT);
});