const express = require("express");
const router  = express.Router();
const { ChatBotQuery } = require("../models/schema");
const Groq = require("groq-sdk");

// GET chat history for user
router.get("/history/:userId", async (req, res) => {
  try {
    const history = await ChatBotQuery.find({ userId: req.params.userId })
      .sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, history });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST save a chat message
router.post("/save", async (req, res) => {
  try {
    const { userId, question, response } = req.body;
    const query = await ChatBotQuery.create({ userId, question, response });
    res.json({ success: true, query });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE clear history
router.delete("/history/:userId", async (req, res) => {
  try {
    await ChatBotQuery.deleteMany({ userId: req.params.userId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST ask AI using Groq
router.post("/ask", async (req, res) => {
  try {
    const { question, history, userId } = req.body;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const messages = [
      {
        role: "system",
        content: `You are Aria, a warm, knowledgeable and empathetic AI health assistant for SheVerse — a women's wellness app. You specialize in women's health topics including menstrual health, nutrition, exercise, mental health, hormonal balance, BMI and weight management, sleep health, and general health questions. Be warm, supportive and empathetic. Give practical actionable advice. Always recommend consulting a doctor for serious medical concerns. Be culturally sensitive — many users are from Bangladesh. Never diagnose medical conditions. Keep responses clear and well-structured with bullet points when helpful.`,
      },
      ...(history || [])
        .filter(m => !m.isError)
        .slice(-6)
        .map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      { role: "user", content: question },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;

    if (userId && userId !== "test") {
      await ChatBotQuery.create({ userId, question, response: answer });
    }

    res.json({ success: true, answer });
  } catch (err) {
    console.error("Groq Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

