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

//
const cors = require("cors");
app.use(cors());
//

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

app.get("/", (req,res)=>{
res.send("SheVerse API running");
});

//

// ================= MENSTRUAL TRACKER ROUTES =================

// 1. Save or update user cycle profile (onboarding data)
//    Called once on first setup, and again if user edits settings
app.post("/api/period/setup", async (req, res) => {
  try {
    const { userId, cycleLength, periodLength, lastStartDate } = req.body;

    // Check if a cycle already exists for this user
    let existing = await PeriodCycle.findOne({ userId }).sort({ startDate: -1 });

    if (existing) {
      // Update the most recent cycle with new info
      existing.startDate   = new Date(lastStartDate);
      existing.cycleLength = cycleLength;
      existing.periodLength = periodLength;
      // Calculate end date from period length
      const endDate = new Date(lastStartDate);
      endDate.setDate(endDate.getDate() + periodLength - 1);
      existing.endDate = endDate;
      await existing.save();
      return res.json({ success: true, message: "Cycle profile updated!", cycle: existing });
    }

    // First time — create new cycle entry
    const endDate = new Date(lastStartDate);
    endDate.setDate(endDate.getDate() + periodLength - 1);

    const cycle = new PeriodCycle({
      userId,
      startDate: new Date(lastStartDate),
      endDate,
      cycleLength,
      periodLength
    });
    await cycle.save();
    // Add this line BEFORE res.json(...)
    const allHistory = await PeriodCycle.find({ userId: req.params.userId }).sort({ startDate: 1 });

    // Then add to res.json:
    allHistory: allHistory.map(c => ({
      startDate: c.startDate.toISOString().split("T")[0],
      endDate:   c.endDate.toISOString().split("T")[0]
    })),

    res.json({ success: true, message: "Cycle profile saved!", cycle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get user cycle profile (to check if onboarding is done)
app.get("/api/period/profile/:userId", async (req, res) => {
  try {
    const cycle = await PeriodCycle.findOne({ userId: req.params.userId }).sort({ startDate: -1 });
    if (!cycle) return res.json({ success: false, message: "No profile found" });
    res.json({ success: true, cycle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get full prediction data for home screen
app.get("/api/period/dashboard/:userId", async (req, res) => {
  try {
    const cycle = await PeriodCycle.findOne({ userId: req.params.userId }).sort({ startDate: -1 });
    if (!cycle) return res.json({ success: false, message: "No profile found" });

    const today         = new Date();
    const lastStart     = new Date(cycle.startDate);
    const cycleLength   = cycle.cycleLength  || 28;
    const periodLength  = cycle.periodLength || 5;

    // Find the current cycle start (most recent one before today)
    let currentCycleStart = new Date(lastStart);
    while (true) {
      const nextStart = new Date(currentCycleStart);
      nextStart.setDate(nextStart.getDate() + cycleLength);
      if (nextStart > today) break;
      currentCycleStart = nextStart;
    }

    const currentCycleEnd = new Date(currentCycleStart);
    currentCycleEnd.setDate(currentCycleEnd.getDate() + periodLength - 1);

    // Next period start
    const nextPeriodStart = new Date(currentCycleStart);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + cycleLength);

    const nextPeriodEnd = new Date(nextPeriodStart);
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() + periodLength - 1);

    // Day of current cycle
    const dayOfCycle = Math.floor((today - currentCycleStart) / 86400000) + 1;

    // Ovulation (roughly day 14 of cycle)
    const ovulationDay  = Math.round(cycleLength / 2);
    const ovulationDate = new Date(currentCycleStart);
    ovulationDate.setDate(ovulationDate.getDate() + ovulationDay - 1);
    const daysToOvulation = Math.round((ovulationDate - today) / 86400000);

    // Days until next period
    const daysUntilPeriod = Math.round((nextPeriodStart - today) / 86400000);

    // Current phase
    let phase = "Luteal", phaseColor = "#9b72cf";
    if (dayOfCycle <= periodLength)                      { phase = "Menstrual";  phaseColor = "#e8637a"; }
    else if (dayOfCycle <= Math.round(cycleLength * 0.45)) { phase = "Follicular"; phaseColor = "#f4a261"; }
    else if (dayOfCycle <= Math.round(cycleLength * 0.55)) { phase = "Ovulation";  phaseColor = "#4caf78"; }

    // Health check
    let healthStatus = "Normal", healthMsg = "Your cycle looks healthy!";
    if (cycleLength < 21)  { healthStatus = "Short"; healthMsg = "Cycles shorter than 21 days — consider consulting a doctor."; }
    if (cycleLength > 35)  { healthStatus = "Long";  healthMsg = "Cycles longer than 35 days — consider consulting a doctor."; }

    // Build next 3 predicted periods
    const predictions = [];
    let pStart = new Date(nextPeriodStart);
    for (let i = 0; i < 3; i++) {
      const pEnd = new Date(pStart);
      pEnd.setDate(pEnd.getDate() + periodLength - 1);
      predictions.push({
        startDate: pStart.toISOString().split("T")[0],
        endDate:   pEnd.toISOString().split("T")[0]
      });
      pStart = new Date(pStart);
      pStart.setDate(pStart.getDate() + cycleLength);
    }

    // Notifications
    const notifications = [];
    if (daysUntilPeriod <= 3 && daysUntilPeriod > 0) {
      notifications.push(`🔔 Your period is expected in ${daysUntilPeriod} day(s). Be prepared!`);
    } else if (daysUntilPeriod === 0) {
      notifications.push("🔴 Your period is expected TODAY!");
    } else if (daysUntilPeriod < 0 && daysUntilPeriod > -3) {
      notifications.push(`⚠️ Your period was expected ${Math.abs(daysUntilPeriod)} day(s) ago.`);
    }
    if (daysToOvulation >= 0 && daysToOvulation <= 2) {
      notifications.push(`🌟 Ovulation expected in ${daysToOvulation} day(s)!`);
    }
    notifications.push("💊 Reminder: Log your daily symptoms for better tracking.");
    notifications.push("💧 Health tip: Stay hydrated during your cycle.");

    res.json({
      success: true,
      profile: { cycleLength, periodLength, lastStartDate: cycle.startDate },
      today: today.toISOString().split("T")[0],
      currentCycle: {
        startDate:  currentCycleStart.toISOString().split("T")[0],
        endDate:    currentCycleEnd.toISOString().split("T")[0],
        dayOfCycle,
        phase,
        phaseColor
      },
      nextPeriod: {
        startDate:    nextPeriodStart.toISOString().split("T")[0],
        endDate:      nextPeriodEnd.toISOString().split("T")[0],
        daysUntil:    daysUntilPeriod
      },
      ovulation: {
        date:     ovulationDate.toISOString().split("T")[0],
        daysUntil: daysToOvulation
      },
      predictions,
      healthStatus,
      healthMsg,
      notifications
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Log a symptom
app.post("/api/symptom/add", async (req, res) => {
  try {
    const { cycleId, symptom, date } = req.body;
    const log = new SymptomLog({ cycleId, symptom, date });
    await log.save();
    res.json({ success: true, message: "Symptom logged!", log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get symptoms for a user on a specific date
app.get("/api/symptom/user/:userId/:date", async (req, res) => {
  try {
    const cycle = await PeriodCycle.findOne({ userId: req.params.userId }).sort({ startDate: -1 });
    if (!cycle) return res.json({ success: false, symptoms: [] });
    const dateStr = req.params.date;
    const start = new Date(dateStr); start.setHours(0,0,0,0);
    const end   = new Date(dateStr); end.setHours(23,59,59,999);
    const symptoms = await SymptomLog.find({ cycleId: cycle._id, date: { $gte: start, $lte: end } });
    res.json({ success: true, symptoms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get all symptoms for a user (history)
app.get("/api/symptom/history/:userId", async (req, res) => {
  try {
    const cycles = await PeriodCycle.find({ userId: req.params.userId });
    const cycleIds = cycles.map(c => c._id);
    const symptoms = await SymptomLog.find({ cycleId: { $in: cycleIds } }).sort({ date: -1 });
    res.json({ success: true, symptoms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Log today's period as a NEW entry (preserves all history)
app.post("/api/period/log-today", async (req, res) => {
  try {
    const { userId, startDate, endDate, cycleLength, periodLength } = req.body;

    const cycle = new PeriodCycle({
      userId,
      startDate:    new Date(startDate),
      endDate:      new Date(endDate),
      cycleLength,
      periodLength
    });
    await cycle.save();

    res.json({ success: true, message: "Period logged!", cycle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get ALL period cycles for a user
app.get("/api/period/all/:userId", async (req, res) => {
  try {
    const cycles = await PeriodCycle.find({ userId: req.params.userId }).sort({ startDate: 1 });
    res.json({ success: true, cycles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//
app.listen(process.env.PORT, ()=>{
console.log("Server running on port " + process.env.PORT);
});



