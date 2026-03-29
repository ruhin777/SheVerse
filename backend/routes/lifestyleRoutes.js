const express = require("express");
const router  = express.Router();
const { BMIRecord, Exercise, ExerciseLog, User } = require("../models/schema");

// GET user BMI history
router.get("/bmi/:userId", async (req, res) => {
  try {
    const records = await BMIRecord.find({ userId: req.params.userId }).sort({ _id: -1 });
    res.json({ success: true, records });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST save BMI record
router.post("/bmi", async (req, res) => {
  try {
    const { userId, height, weight } = req.body;
    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    let category = "";
    if (bmi < 18.5) category = "Underweight";
    else if (bmi < 25) category = "Normal";
    else if (bmi < 30) category = "Overweight";
    else category = "Obese";
    const record = await BMIRecord.create({ userId, height, weight, bmi: parseFloat(bmi), category });
    res.json({ success: true, record });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET exercises (filter by category)
router.get("/exercises", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const exercises = await Exercise.find(filter);
    res.json({ success: true, exercises });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST seed exercises
router.post("/exercises/seed", async (req, res) => {
  try {
    await Exercise.deleteMany({});
    await Exercise.insertMany([
      { name:"Morning Walk", category:"Cardio", difficulty:"Easy", duration:"30 mins"},
      { name:"Jumping Jacks", category:"Cardio", difficulty:"Easy", duration:"10 mins" },
      { name:"Jogging", category:"Cardio", difficulty:"Medium", duration:"20 mins"},
      { name:"Cycling", category:"Cardio", difficulty:"Medium", duration:"30 mins" },
      { name:"Swimming", category:"Cardio", difficulty:"Medium", duration:"30 mins" },
      { name:"Push-ups", category:"Strength", difficulty:"Medium", duration:"10 mins" },
      { name:"Squats", category:"Strength", difficulty:"Easy", duration:"10 mins" },
      { name:"Lunges", category:"Strength", difficulty:"Easy", duration:"10 mins" },
      { name:"Plank", category:"Strength", difficulty:"Medium", duration:"5 mins" },
      { name:"Dumbbell Rows", category:"Strength", difficulty:"Medium", duration:"15 mins" },
      { name:"Sun Salutation", category:"Yoga", difficulty:"Easy", duration:"15 mins"},
      { name:"Child's Pose", category:"Yoga", difficulty:"Easy", duration:"5 mins" },
      { name:"Warrior Pose", category:"Yoga", difficulty:"Medium", duration:"10 mins" },
      { name:"Cat-Cow Stretch", category:"Yoga", difficulty:"Easy", duration:"5 mins" },
      { name:"Downward Dog", category:"Yoga", difficulty:"Easy", duration:"5 mins" },
      { name:"Butterfly Stretch", category:"Flexibility", difficulty:"Easy", duration:"5 mins" },
      { name:"Standing Hamstring Stretch", category:"Flexibility", difficulty:"Easy", duration:"5 mins" },
      { name:"Shoulder Rolls", category:"Flexibility", difficulty:"Easy", duration:"5 mins" },
      { name:"Hip Flexor Stretch", category:"Flexibility", difficulty:"Easy", duration:"5 mins"},
      { name:"Seated Spinal Twist", category:"Flexibility", difficulty:"Easy", duration:"5 mins"},
    ]);
    res.json({ success: true, message: "✅ Exercises seeded!" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST log exercise completion
router.post("/exercises/log", async (req, res) => {
  try {
    const { userId, exerciseId } = req.body;
    const log = await ExerciseLog.create({ userId, exerciseId, completed: true, date: new Date() });
    res.json({ success: true, log });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET today's exercise logs for user
router.get("/exercises/log/:userId", async (req, res) => {
  try {
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);
    const logs = await ExerciseLog.find({ userId: req.params.userId, date: { $gte: start, $lte: end } });
    const completedIds = logs.map(l => l.exerciseId?.toString());
    res.json({ success: true, completedIds });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;