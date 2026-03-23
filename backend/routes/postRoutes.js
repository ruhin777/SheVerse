const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// ── Multer setup ──
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, "uploads/"); },
  filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage });

// ── Schemas ──
const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  isAnonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

const reactionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emoji: { type: String, enum: ["❤️", "👍", "😂", "😮", "😢"], required: true },
});
const Reaction = mongoose.models.Reaction || mongoose.model("Reaction", reactionSchema);

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);

// ── POSTS ──

// Create Post
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userId, username, content, isAnonymous } = req.body;
    const isAnon = isAnonymous === "true" || isAnonymous === true;

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const post = new Post({
      userId,
      username, // always store real username
      content,
      image,
      isAnonymous: isAnon,
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Edit Post
router.put("/:id", async (req, res) => {
  try {
    const { content, userId } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    post.content = content;
    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete Post
router.delete("/:id/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Post.findByIdAndDelete(id);
    await Reaction.deleteMany({ postId: id });
    await Comment.deleteMany({ postId: id });

    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ── REACTIONS ──

// Add / Update reaction
router.post("/reaction", async (req, res) => {
  try {
    const { postId, userId, emoji } = req.body;

    let reaction = await Reaction.findOne({ postId, userId });

    if (reaction) reaction.emoji = emoji;
    else reaction = new Reaction({ postId, userId, emoji });

    await reaction.save();
    res.json(reaction);
  } catch (err) {
    res.status(500).json({ error: "Failed to react" });
  }
});

// Remove reaction
router.delete("/reaction", async (req, res) => {
  try {
    const { postId, userId } = req.body;

    await Reaction.findOneAndDelete({ postId, userId });

    res.json({ message: "Reaction removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove reaction" });
  }
});

// Get reactions
router.get("/reaction/:postId", async (req, res) => {
  try {
    const reactions = await Reaction.find({ postId: req.params.postId });
    res.json(reactions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// ── COMMENTS ──

// Add comment
router.post("/comment", async (req, res) => {
  try {
    const { postId, userId, username, text } = req.body;

    const comment = new Comment({ postId, userId, username, text });
    await comment.save();

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to comment" });
  }
});

// Get comments
router.get("/comment/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Edit comment
router.put("/comment/:id", async (req, res) => {
  try {
    const { text, userId } = req.body;

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    comment.text = text;
    await comment.save();

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to edit comment" });
  }
});

// Delete comment
router.delete("/comment/:id/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Comment.findByIdAndDelete(id);

    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

module.exports = router;