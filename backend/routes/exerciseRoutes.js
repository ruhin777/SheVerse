const express = require("express");
const router  = express.Router();
const { Exercise, ExerciseLog, TodoTask } = require("../models/schema");

// GET all exercises (filter by category/difficulty)
router.get("/", async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    let filter = {};
    if (category && category !== "All") filter.category = category;
    if (difficulty && difficulty !== "All") filter.difficulty = difficulty;
    const exercises = await Exercise.find(filter);
    res.json({ success: true, exercises });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET single exercise
router.get("/detail/:id", async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    res.json({ success: true, exercise });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET user's todo list
router.get("/todo/:userId", async (req, res) => {
  try {
    const todos = await TodoTask.find({ userId: req.params.userId });
    res.json({ success: true, todos });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST add exercise to todo
router.post("/todo", async (req, res) => {
  try {
    const { userId, title } = req.body;
    const existing = await TodoTask.findOne({ userId, title });
    if (existing) return res.json({ success: false, message: "Already in your list!" });
    const todo = await TodoTask.create({ userId, title, completed: false });
    res.json({ success: true, todo });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH toggle todo complete
router.patch("/todo/:id", async (req, res) => {
  try {
    const todo = await TodoTask.findById(req.params.id);
    todo.completed = !todo.completed;
    await todo.save();
    res.json({ success: true, todo });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE todo item
router.delete("/todo/:id", async (req, res) => {
  try {
    await TodoTask.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET today's completed exercises
router.get("/log/:userId", async (req, res) => {
  try {
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);
    const logs = await ExerciseLog.find({ userId: req.params.userId, date: { $gte: start, $lte: end } });
    res.json({ success: true, completedIds: logs.map(l => l.exerciseId?.toString()) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST log exercise completion
router.post("/log", async (req, res) => {
  try {
    const { userId, exerciseId } = req.body;
    const log = await ExerciseLog.create({ userId, exerciseId, completed: true, date: new Date() });
    res.json({ success: true, log });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST seed exercises
router.post("/seed", async (req, res) => {
  try {
    await Exercise.deleteMany({});
    await Exercise.insertMany(EXERCISES);
    res.json({ success: true, message: `✅ ${EXERCISES.length} exercises seeded!` });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;

// ══════════════════════════════════════
//  SEED DATA
// ══════════════════════════════════════
const EXERCISES = [
  // ── CARDIO ──
  { name:"Brisk Walking", category:"Cardio", difficulty:"Easy", duration:"30 mins",
    image:"https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600",
    instructions:"1. Stand tall with shoulders relaxed.\n2. Swing arms naturally at your sides.\n3. Walk at a pace where you can talk but feel slightly breathless.\n4. Land heel first, roll through to toes.\n5. Breathe rhythmically — in for 3 steps, out for 3 steps.\n6. Cool down with 5 minutes of slow walking." },

  { name:"Jogging", category:"Cardio", difficulty:"Medium", duration:"20 mins",
    image:"https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600",
    instructions:"1. Warm up with 5 minutes of brisk walking.\n2. Run at a comfortable, conversational pace.\n3. Land midfoot, not heel — reduces injury risk.\n4. Keep core engaged and back straight.\n5. Arms bent at 90 degrees, hands relaxed.\n6. Cool down with walking and stretching." },

  { name:"Jump Rope", category:"Cardio", difficulty:"Medium", duration:"15 mins",
    image:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600",
    instructions:"1. Hold handles lightly, rope behind you.\n2. Turn rope with wrists, not arms.\n3. Jump on the balls of your feet, just 1-2 inches off ground.\n4. Keep knees slightly bent on landing.\n5. Start with 30 seconds on, 30 seconds rest.\n6. Build to continuous 5-minute sessions." },

  { name:"High Knees", category:"Cardio", difficulty:"Medium", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600",
    instructions:"1. Stand with feet hip-width apart.\n2. Drive right knee up toward chest while hopping on left foot.\n3. Quickly switch legs in a running motion.\n4. Pump arms in opposition to legs.\n5. Keep core tight throughout.\n6. Do 30 seconds on, 15 seconds rest." },

  { name:"Cycling", category:"Cardio", difficulty:"Medium", duration:"30 mins",
    image:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
    instructions:"1. Adjust seat height so leg is almost fully extended at bottom of pedal stroke.\n2. Keep back straight and relaxed.\n3. Pedal in smooth circular motion.\n4. Maintain steady cadence of 70-90 RPM.\n5. Use gears to maintain effort without straining knees.\n6. Stay hydrated throughout ride." },

  { name:"Burpees", category:"Cardio", difficulty:"Hard", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600",
    instructions:"1. Stand with feet shoulder-width apart.\n2. Drop into squat and place hands on floor.\n3. Jump feet back to plank position.\n4. Perform a push-up (optional).\n5. Jump feet to hands, then explode upward.\n6. Clap hands overhead at top.\n7. Start with 5 reps and build up." },

  { name:"Swimming", category:"Cardio", difficulty:"Medium", duration:"30 mins",
    image:"https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600",
    instructions:"1. Enter pool safely using steps or ladder.\n2. Begin with freestyle stroke — reach forward, pull water past hip.\n3. Rotate body slightly with each stroke.\n4. Turn head to breathe every 2-3 strokes.\n5. Kick from hips with straight legs.\n6. Rest at wall between laps as needed." },

  // ── STRENGTH ──
  { name:"Push-Ups", category:"Strength", difficulty:"Medium", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1598971457999-ca4ef48a9a71?w=600",
    instructions:"1. Start in high plank — hands slightly wider than shoulders.\n2. Keep body in straight line from head to heels.\n3. Lower chest toward floor by bending elbows.\n4. Elbows at 45-degree angle to body.\n5. Push back up to full arm extension.\n6. Breathe out on the way up.\n7. Modify by dropping to knees if needed." },

  { name:"Squats", category:"Strength", difficulty:"Easy", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=600",
    instructions:"1. Stand with feet shoulder-width apart, toes slightly out.\n2. Engage core and keep chest up.\n3. Push hips back and bend knees simultaneously.\n4. Lower until thighs are parallel to floor.\n5. Keep knees tracking over toes.\n6. Drive through heels to stand back up.\n7. Squeeze glutes at the top." },

  { name:"Lunges", category:"Strength", difficulty:"Easy", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600",
    instructions:"1. Stand tall with feet together.\n2. Step forward with right foot about 2 feet.\n3. Lower back knee toward floor.\n4. Front knee stays directly above ankle.\n5. Push through front heel to return.\n6. Alternate legs for each rep.\n7. Keep torso upright throughout." },

  { name:"Plank", category:"Strength", difficulty:"Medium", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=600",
    instructions:"1. Start on forearms and toes.\n2. Elbows directly under shoulders.\n3. Body forms straight line from head to heels.\n4. Engage core — imagine pulling belly button toward spine.\n5. Don't let hips sag or rise.\n6. Breathe steadily throughout.\n7. Start with 20-second holds and build up." },

  { name:"Glute Bridges", category:"Strength", difficulty:"Easy", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600",
    instructions:"1. Lie on back, knees bent, feet flat on floor.\n2. Arms by sides, palms down.\n3. Squeeze glutes and push hips toward ceiling.\n4. Create straight line from knees to shoulders.\n5. Hold at top for 2 seconds.\n6. Lower slowly back to floor.\n7. Complete 15-20 reps per set." },

  { name:"Mountain Climbers", category:"Strength", difficulty:"Hard", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600",
    instructions:"1. Start in high plank position.\n2. Drive right knee toward chest.\n3. Quickly switch — extend right leg while driving left knee in.\n4. Alternate legs in running motion.\n5. Keep hips level — don't let them rock.\n6. Keep core engaged throughout.\n7. Start slow, build speed as form improves." },

  // ── YOGA ──
  { name:"Sun Salutation", category:"Yoga", difficulty:"Medium", duration:"15 mins",
    image:"https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600",
    instructions:"1. Mountain Pose: Stand tall, hands at heart center.\n2. Raised Arms: Inhale, sweep arms overhead.\n3. Forward Fold: Exhale, fold forward.\n4. Half Lift: Inhale, lengthen spine.\n5. Plank: Exhale, step back.\n6. Chaturanga: Lower down with control.\n7. Upward Dog: Inhale, press up.\n8. Downward Dog: Exhale, lift hips.\n9. Step forward and rise back to Mountain." },

  { name:"Warrior I", category:"Yoga", difficulty:"Medium", duration:"10 mins",
    image:"https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600",
    instructions:"1. From Mountain Pose, step left foot back 4 feet.\n2. Turn left foot out to 45 degrees.\n3. Bend right knee over right ankle.\n4. Square hips toward front.\n5. Inhale, raise arms overhead.\n6. Gaze forward or slightly up.\n7. Hold for 5-10 breaths, then switch sides." },

  { name:"Child's Pose", category:"Yoga", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600",
    instructions:"1. Kneel on mat with big toes touching.\n2. Sit back on heels.\n3. Fold forward, extending arms in front.\n4. Rest forehead on mat.\n5. Breathe deeply into your back.\n6. Hold for 1-3 minutes.\n7. Return slowly to kneeling." },

  { name:"Tree Pose", category:"Yoga", difficulty:"Medium", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600",
    instructions:"1. Stand in Mountain Pose.\n2. Shift weight to left foot.\n3. Place right foot on inner left thigh or calf (not knee).\n4. Bring hands to heart center.\n5. Find a fixed gaze point for balance.\n6. Hold 5-10 breaths.\n7. Switch sides." },

  { name:"Downward Dog", category:"Yoga", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600",
    instructions:"1. Start on hands and knees.\n2. Tuck toes and lift hips toward ceiling.\n3. Form inverted V shape.\n4. Press heels toward floor (they don't need to touch).\n5. Lengthen spine by reaching hips up.\n6. Relax head between arms.\n7. Hold 5-10 breaths." },

  // ── FLEXIBILITY ──
  { name:"Butterfly Stretch", category:"Flexibility", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600",
    instructions:"1. Sit on floor with back straight.\n2. Bring soles of feet together in front.\n3. Hold feet with both hands.\n4. Gently press knees toward floor.\n5. Lean forward slightly from hips.\n6. Hold 30-60 seconds.\n7. Breathe deeply and relax into stretch." },

  { name:"Cat-Cow Stretch", category:"Flexibility", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600",
    instructions:"1. Start on hands and knees, wrists under shoulders.\n2. Cat: Exhale, round spine toward ceiling, tuck chin and tailbone.\n3. Cow: Inhale, drop belly toward floor, lift head and tailbone.\n4. Flow smoothly between positions.\n5. Move with your breath.\n6. Complete 10-15 slow cycles.\n7. End in neutral spine position." },

  { name:"Hip Flexor Stretch", category:"Flexibility", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600",
    instructions:"1. Kneel on right knee, left foot forward.\n2. Left knee bent at 90 degrees.\n3. Shift weight forward until you feel stretch in right hip.\n4. Keep torso upright.\n5. Hold 30-45 seconds.\n6. For deeper stretch, raise right arm overhead.\n7. Switch sides." },

  { name:"Standing Forward Fold", category:"Flexibility", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600",
    instructions:"1. Stand with feet hip-width apart.\n2. Soften knees slightly.\n3. Hinge from hips and fold forward.\n4. Let head hang heavy.\n5. Grasp elbows or reach for floor.\n6. Hold 30-60 seconds, breathing deeply.\n7. Roll up slowly to standing." },

  { name:"Seated Spinal Twist", category:"Flexibility", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600",
    instructions:"1. Sit with legs extended.\n2. Bend right knee and cross over left leg.\n3. Place right foot flat on floor outside left knee.\n4. Inhale to lengthen spine.\n5. Exhale and twist right, placing left elbow outside right knee.\n6. Look over right shoulder.\n7. Hold 5-10 breaths, switch sides." },

  { name:"Shoulder Rolls", category:"Flexibility", difficulty:"Easy", duration:"5 mins",
    image:"https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600",
    instructions:"1. Stand or sit with back straight.\n2. Relax arms at sides.\n3. Roll both shoulders forward in large circles — 10 times.\n4. Roll both shoulders backward — 10 times.\n5. Then alternate: right forward, left forward.\n6. Finish with gentle neck rolls.\n7. Breathe slowly throughout." },
];