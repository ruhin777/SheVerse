const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// ── Multer setup (same as original) ──
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, "uploads/"); },
  filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage });

// ── Schemas ──
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  creatorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

const groupMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  joinedAt: { type: Date, default: Date.now }
});
const GroupMember = mongoose.models.GroupMember || mongoose.model("GroupMember", groupMemberSchema);

const groupPostSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const GroupPost = mongoose.models.GroupPost || mongoose.model("GroupPost", groupPostSchema);

const groupReactionSchema = new mongoose.Schema({
  groupPostId: { type: mongoose.Schema.Types.ObjectId, ref: "GroupPost", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emoji: { type: String, enum: ["❤️", "👍", "😂", "😮", "😢"], required: true }
});
const GroupReaction = mongoose.models.GroupReaction || mongoose.model("GroupReaction", groupReactionSchema);

const groupCommentSchema = new mongoose.Schema({
  groupPostId: { type: mongoose.Schema.Types.ObjectId, ref: "GroupPost", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const GroupComment = mongoose.models.GroupComment || mongoose.model("GroupComment", groupCommentSchema);

// ══════════════════════════════════════════
//  IMPORTANT: All static/specific routes MUST
//  come before /:id to avoid Express conflicts
// ══════════════════════════════════════════

// ── Categories ──
router.get("/categories/list", async (req, res) => {
  try {
    const { search } = req.query;
    let categories = await Group.distinct("category");
    if (search) {
      categories = categories.filter(c =>
        c.toLowerCase().includes(search.toLowerCase())
      );
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ── Reactions ──
router.post("/reaction", async (req, res) => {
  try {
    const { groupPostId, userId, emoji } = req.body;
    let reaction = await GroupReaction.findOne({ groupPostId, userId });
    if (reaction) reaction.emoji = emoji;
    else reaction = new GroupReaction({ groupPostId, userId, emoji });
    await reaction.save();
    res.json(reaction);
  } catch (err) {
    res.status(500).json({ error: "Failed to react" });
  }
});

router.delete("/reaction", async (req, res) => {
  try {
    const { groupPostId, userId } = req.body;
    await GroupReaction.findOneAndDelete({ groupPostId, userId });
    res.json({ message: "Reaction removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove reaction" });
  }
});

router.get("/reaction/:groupPostId", async (req, res) => {
  try {
    const reactions = await GroupReaction.find({ groupPostId: req.params.groupPostId });
    res.json(reactions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// ── Comments ──
router.post("/comment", async (req, res) => {
  try {
    const { groupPostId, userId, username, text } = req.body;
    const comment = new GroupComment({ groupPostId, userId, username, text });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to comment" });
  }
});

router.get("/comment/:groupPostId", async (req, res) => {
  try {
    const comments = await GroupComment.find({ groupPostId: req.params.groupPostId }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.put("/comment/:id", async (req, res) => {
  try {
    const { text, userId } = req.body;
    const comment = await GroupComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.userId.toString() !== userId) return res.status(403).json({ error: "Not authorized" });
    comment.text = text;
    await comment.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to edit comment" });
  }
});

router.delete("/comment/:id/:userId", async (req, res) => {
  try {
    const comment = await GroupComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.userId.toString() !== req.params.userId) return res.status(403).json({ error: "Not authorized" });
    await GroupComment.findByIdAndDelete(req.params.id);
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// ── Group Posts (static prefix) ──
router.put("/posts/:postId", async (req, res) => {
  try {
    const { content, userId } = req.body;
    const post = await GroupPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorId.toString() !== userId) return res.status(403).json({ error: "Not authorized" });
    post.content = content;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to edit post" });
  }
});

router.delete("/posts/:postId/:userId", async (req, res) => {
  try {
    const post = await GroupPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorId.toString() !== req.params.userId) return res.status(403).json({ error: "Not authorized" });
    await GroupPost.findByIdAndDelete(req.params.postId);
    await GroupReaction.deleteMany({ groupPostId: req.params.postId });
    await GroupComment.deleteMany({ groupPostId: req.params.postId });
    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ── Groups list & create ──
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } }
        ]
      };
    }
    const groups = await Group.find(query).sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, category, creatorId, creatorName } = req.body;
    if (!name || !category || !creatorId || !creatorName)
      return res.status(400).json({ error: "All fields required" });

    const group = new Group({ name, category, creatorId, creatorName, username: creatorName });
    await group.save();

    // Auto-join creator as first member
    const member = new GroupMember({ userId: creatorId, username: creatorName, groupId: group._id });
    await member.save();

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: "Failed to create group" });
  }
});

// Get groups by category
router.get("/category/:cat", async (req, res) => {
  try {
    const groups = await Group.find({
      category: { $regex: `^${req.params.cat}$`, $options: "i" }
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups by category" });
  }
});

// ── Sub-routes with /:id — members & posts ──
router.get("/:id/members", async (req, res) => {
  try {
    const { search } = req.query;
    let members = await GroupMember.find({ groupId: req.params.id });
    if (search) {
      members = members.filter(m =>
        m.username.toLowerCase().includes(search.toLowerCase())
      );
    }
    res.json(members);
  } catch (err) {
    console.error("Members fetch error:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.get("/:id/ismember/:userId", async (req, res) => {
  try {
    const member = await GroupMember.findOne({
      groupId: req.params.id,
      userId: req.params.userId
    });
    res.json({ isMember: !!member });
  } catch (err) {
    res.status(500).json({ error: "Failed to check membership" });
  }
});

router.post("/:id/join", async (req, res) => {
  try {
    const { userId, username } = req.body;
    const exists = await GroupMember.findOne({ groupId: req.params.id, userId });
    if (exists) return res.status(400).json({ error: "Already a member" });
    const member = new GroupMember({ userId, username, groupId: req.params.id });
    await member.save();
    res.status(201).json({ message: "Joined successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to join group" });
  }
});

// Leave group — if admin/creator leaves, next oldest member becomes admin
router.delete("/:id/leave/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // 1. User ke member list theke delete kora
    await GroupMember.findOneAndDelete({ groupId: id, userId });

    // 2. Jodi admin/creator nije leave kore, next member ke admin banano
    if (group.creatorId.toString() === userId) {
      const nextMember = await GroupMember.findOne({ groupId: id }).sort({ joinedAt: 1 });
      
      if (nextMember) {
        // Direct MongoDB Update
        await Group.updateOne(
          { _id: id },
          { 
            $set: { 
              creatorId: nextMember.userId, 
              creatorName: nextMember.username,
              username: nextMember.username  
            } 
          }
        );
      }
    }

    // 3. Update howar por fresh data ene frontend-e pathano
    const updatedGroup = await Group.findById(id).lean();
    res.json({ message: "Left group successfully", group: updatedGroup });

  } catch (err) {
    console.error("Leave group error:", err);
    res.status(500).json({ error: "Failed to leave group" });
  }
});

// ── DELETE GROUP (admin/creator only) ──
router.delete("/:id/delete/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.creatorId.toString() !== userId) {
      return res.status(403).json({ error: "Only the group admin can delete this group" });
    }

    const posts = await GroupPost.find({ groupId: id });
    const postIds = posts.map(p => p._id);

    if (postIds.length > 0) {
      await GroupReaction.deleteMany({ groupPostId: { $in: postIds } });
      await GroupComment.deleteMany({ groupPostId: { $in: postIds } });
    }

    await GroupPost.deleteMany({ groupId: id });
    await GroupMember.deleteMany({ groupId: id });
    await Group.findByIdAndDelete(id);

    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete group" });
  }
});

router.get("/:id/posts", async (req, res) => {
  try {
    const posts = await GroupPost.find({ groupId: req.params.id }).sort({ timestamp: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ── Create group post ──
router.post("/:id/posts", async (req, res) => {
  try {
    const { authorId, authorName, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    const isMember = await GroupMember.findOne({ groupId: req.params.id, userId: authorId });
    if (!isMember) return res.status(403).json({ error: "You must be a member to post" });

    // CHANGED: removed isAnonymous — not stored or used anymore
    const post = new GroupPost({
      groupId: req.params.id,
      authorId,
      authorName,
      username: authorName,
      content,
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ── Single group — MUST be last ──
router.get("/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

module.exports = router;