import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/posts";
const API_PROFILE = "http://localhost:5000/api/profile"; // ADDED: for fetching profile pics
const emojis = ["❤️", "👍", "😂", "😮", "😢"];

// ── Cloudinary config ──
const CLOUDINARY_CLOUD_NAME = "dgtzgke3h"; // cloud name
const CLOUDINARY_UPLOAD_PRESET = "sheverse_uploads"; //unsigned upload preset

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return data.secure_url; // returns the public URL
}

// ── YouTube embed helper (same as GroupPage) ──
const getYouTubeEmbed = (url) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

export default function PostPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [newPost, setNewPost] = useState({ content: "", isAnonymous: false, image: null });
  const [uploading, setUploading] = useState(false);

  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostText, setEditPostText] = useState("");

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  // ADDED: profile pics cache — maps userId -> photo url (or null)
  const [userProfiles, setUserProfiles] = useState({});

  // ADDED: fetch profile pic for a userId, cache it in userProfiles
  const fetchUserProfile = async (userId) => {
    if (!userId || userProfiles[userId] !== undefined) return;
    try {
      const { data } = await axios.get(`${API_PROFILE}/${userId}`);
      setUserProfiles(prev => ({ ...prev, [userId]: data.photo || null }));
    } catch {
      setUserProfiles(prev => ({ ...prev, [userId]: null }));
    }
  };

  // ADDED: helper to render avatar — profile pic if available, else first letter fallback
  const renderAvatar = (userId, displayName) => {
    const photo = userProfiles[userId];
    if (photo) {
      return (
        <img
          src={photo}
          alt={displayName}
          style={{ ...S.postAvatar, objectFit: "cover" }}
        />
      );
    }
    return (
      <div style={S.postAvatar}>{(displayName || "U")[0].toUpperCase()}</div>
    );
  };

  const fetchPosts = async () => {
    const { data } = await axios.get(API);
    const normalized = data.map(p => ({
      ...p,
      createdAt: p.createdAt || p.timestamp
    }));
    setPosts(normalized);
    normalized.forEach(p => fetchReactions(p._id));
    normalized.forEach(p => fetchComments(p._id));
    // ADDED: fetch profile pics for all post authors
    normalized.forEach(p => {
      const uid = p.isAnonymous ? null : p.userId?.toString();
      if (uid) fetchUserProfile(uid);
    });
  };

  const fetchReactions = async (postId) => {
    const { data } = await axios.get(`${API}/reaction/${postId}`);
    setReactions(prev => ({ ...prev, [postId]: data }));
  };

  const fetchComments = async (postId) => {
    const { data } = await axios.get(`${API}/comment/${postId}`);
    setComments(prev => ({ ...prev, [postId]: data }));
    // ADDED: fetch profile pics for all commenters
    data.forEach(c => fetchUserProfile(c.userId?.toString()));
  };

  const handlePost = async () => {
    if (!newPost.content.trim() && !newPost.image) return;

    setUploading(true);
    try {
      let imageUrl = null;

      // ── Upload image to Cloudinary if attached ──
      if (newPost.image) {
        imageUrl = await uploadToCloudinary(newPost.image);
      }

      // ── Send JSON (not FormData) since image is now a URL ──
      await axios.post(API, {
        userId: user._id,
        username: user?.name || "Unknown User",
        content: newPost.content,
        isAnonymous: newPost.isAnonymous,
        image: imageUrl,  // Cloudinary URL or null
      });

      setNewPost({ content: "", isAnonymous: false, image: null });
      fetchPosts();
    } catch (err) {
      alert("Failed to post. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (postId, emoji) => {
    await axios.post(`${API}/reaction`, { postId, userId: user._id, emoji });
    fetchReactions(postId);
  };

  const handleRemoveReaction = async (postId) => {
    await axios.delete(`${API}/reaction`, { data: { postId, userId: user._id } });
    fetchReactions(postId);
  };

  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    await axios.post(`${API}/comment`, {
      postId,
      userId: user._id,
      username: user.name,
      text: newComment[postId],
    });
    setNewComment(prev => ({ ...prev, [postId]: "" }));
    fetchComments(postId);
  };

  const handleSavePost = async (postId) => {
    await axios.put(`${API}/${postId}`, { content: editPostText, userId: user._id });
    setEditingPostId(null);
    fetchPosts();
  };

  const handleDeletePost = async (postId) => {
    await axios.delete(`${API}/${postId}/${user._id}`);
    fetchPosts();
  };

  const handleSaveComment = async (comment) => {
    await axios.put(`${API}/comment/${comment._id}`, {
      text: editCommentText,
      userId: user._id
    });
    setEditingCommentId(null);
    fetchComments(comment.postId);
  };

  const handleDeleteComment = async (comment) => {
    await axios.delete(`${API}/comment/${comment._id}/${user._id}`);
    fetchComments(comment.postId);
  };

  useEffect(() => {
    fetchPosts();
    // ADDED: fetch current user's own profile pic
    fetchUserProfile(user._id);
  }, []);

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.content}>

        {/* ── Post Composer ── */}
        <div style={S.card}>
          {/* Author row with avatar */}
          <div style={S.composerAuthor}>
            {/* CHANGED: show profile pic if available, else avatar fallback */}
            {renderAvatar(newPost.isAnonymous ? null : user._id, newPost.isAnonymous ? "Anonymous User" : user.name)}
            <span style={S.composerName}>
              {newPost.isAnonymous ? "Anonymous User" : user.name}
            </span>
          </div>

          <textarea
            placeholder="What's on your mind?"
            value={newPost.content}
            onChange={e => setNewPost({ ...newPost, content: e.target.value })}
            style={S.textarea}
          />

          <div style={S.postActions}>
            <label style={S.checkbox}>
              <input
                type="checkbox"
                checked={newPost.isAnonymous}
                onChange={e => setNewPost({ ...newPost, isAnonymous: e.target.checked })}
              />
              Post anonymously
            </label>

            <label style={S.fileLabel}>
              📎 {newPost.image ? newPost.image.name : "Attach image"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => setNewPost({ ...newPost, image: e.target.files[0] })}
              />
            </label>

            <button onClick={handlePost} style={S.btn} disabled={uploading}>
              {uploading ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {/* ── Posts Feed ── */}
        {posts.map(p => {
          const postReactions = reactions[p._id] || [];
          const postComments = comments[p._id] || [];
          const userReaction = postReactions.find(r => r.userId?.toString() === user._id)?.emoji;
          const countReactions = emojis.map(e => postReactions.filter(r => r.emoji === e).length);

          const isAnon = p.isAnonymous === true || p.isAnonymous === "true";
          const displayName = isAnon ? "Anonymous User" : (p.username || "Unknown User");
          // ADDED: use userId for profile pic lookup (null if anonymous)
          const postAuthorId = isAnon ? null : p.userId?.toString();

          return (
            <div key={p._id} style={S.card}>
              {/* Post header with avatar */}
              <div style={S.postHeader}>
                <div style={S.postAuthorRow}>
                  {/* CHANGED: show profile pic if available, else avatar fallback */}
                  {renderAvatar(postAuthorId, displayName)}
                  <div>
                    <strong style={S.postAuthor}>{displayName}</strong>
                    <div style={S.timestamp}>{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                {user._id === p.userId?.toString() && (
                  <div style={S.actionRow}>
                    <button onClick={() => { setEditingPostId(p._id); setEditPostText(p.content); }} style={S.commentBtn}>Edit</button>
                    <button onClick={() => handleDeletePost(p._id)} style={S.commentBtn}>Delete</button>
                  </div>
                )}
              </div>

              {editingPostId === p._id ? (
                <>
                  <textarea
                    value={editPostText}
                    onChange={e => setEditPostText(e.target.value)}
                    style={S.textarea}
                  />
                  <button onClick={() => handleSavePost(p._id)} style={S.commentBtn}>Save</button>
                </>
              ) : (
                // ── Clickable links + YouTube embed (same as GroupPage) ──
                <p style={S.postText}>
                  {p.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                    const embed = getYouTubeEmbed(part);
                    if (embed) {
                      return (
                        <iframe
                          key={i}
                          width="100%"
                          height="220"
                          src={embed}
                          frameBorder="0"
                          allowFullScreen
                          style={{ borderRadius: 10, marginTop: 8, display: "block" }}
                        />
                      );
                    }
                    if (part.match(/https?:\/\/[^\s]+/)) {
                      return (
                        <a
                          key={i}
                          href={part}
                          target="_blank"
                          rel="noreferrer"
                          style={S.postLink}
                        >
                          {part}
                        </a>
                      );
                    }
                    return part;
                  })}
                </p>
              )}

              {/* Image — now a Cloudinary URL, visible to everyone */}
              {p.image && (
                <img src={p.image} style={S.postImage} alt="post" />
              )}

              {/* Reactions */}
              <div style={S.reactions}>
                {emojis.map((e, i) => (
                  <button
                    key={i}
                    style={{
                      ...S.emojiBtn,
                      fontWeight: userReaction === e ? "bold" : "normal",
                      background: userReaction === e ? "#f3e8ff" : "transparent"
                    }}
                    onClick={() => handleReaction(p._id, e)}
                  >
                    {e} {countReactions[i] > 0 && <span style={S.reactionCount}>{countReactions[i]}</span>}
                  </button>
                ))}
                {userReaction && (
                  <button onClick={() => handleRemoveReaction(p._id)} style={S.commentBtn}>Remove</button>
                )}
              </div>

              {/* Comments */}
              <div style={S.comments}>
                {postComments.map(c => (
                  <div key={c._id} style={S.commentBox}>
                    {/* ADDED: commenter profile pic or avatar fallback */}
                    {renderAvatar(c.userId?.toString(), c.username)}
                    <div style={S.commentText}>
                      {editingCommentId === c._id ? (
                        <>
                          <input
                            value={editCommentText}
                            onChange={e => setEditCommentText(e.target.value)}
                            style={S.commentInput}
                          />
                          <button onClick={() => handleSaveComment(c)} style={S.commentBtn}>Save</button>
                        </>
                      ) : (
                        <><strong>{c.username || "Unknown User"}</strong>: {c.text}</>
                      )}
                    </div>
                    {c.userId?.toString() === user._id && (
                      <div>
                        <button onClick={() => { setEditingCommentId(c._id); setEditCommentText(c.text); }} style={S.commentBtn}>Edit</button>
                        <button onClick={() => handleDeleteComment(c)} style={S.commentBtn}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}

                <input
                  placeholder="Write a comment..."
                  value={newComment[p._id] || ""}
                  onChange={e => setNewComment(prev => ({ ...prev, [p._id]: e.target.value }))}
                  style={S.commentInput}
                />
                <button onClick={() => handleAddComment(p._id)} style={S.commentBtn}>Comment</button>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}

const S = {
  wrapper: { position: "relative", minHeight: "100vh", fontFamily: "Georgia, serif" },

  bg: {
    position: "fixed",
    inset: 0,
    backgroundImage: "url('https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(0.5px)",
    transform: "scale(1.1)",
    zIndex: -2
  },

  overlay: { position: "fixed", inset: 0, background: "rgba(255,245,250,0.7)", zIndex: -1 },
  content: { maxWidth: 650, margin: "30px auto", position: "relative", zIndex: 1 },

  card: {
    background: "#fff",
    padding: 20,
    marginBottom: 20,
    borderRadius: 14,
    boxShadow: "0 6px 18px rgba(157,107,157,0.15)"
  },

  // ── Avatar & composer row ──
  composerAuthor: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  composerName: { fontSize: 14, fontFamily: "sans-serif", color: "#3b0764", fontWeight: 500 },

  postHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  postAuthorRow: { display: "flex", alignItems: "center", gap: 10 },
  postAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #e879a8, #c084c4)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: "bold", flexShrink: 0
  },
  postAuthor: { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif" },
  timestamp: { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif" },

  textarea: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e9d5ff",
    resize: "vertical",
    boxSizing: "border-box",
    marginBottom: 10,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: "#3b0764",
    outline: "none"
  },

  postText: { marginTop: 10, lineHeight: 1.6, wordBreak: "break-word", fontFamily: "sans-serif", color: "#3b0764" },
  postLink: {
    color: "#7c3aed", fontSize: 13, fontFamily: "sans-serif",
    wordBreak: "break-all", textDecoration: "none"
  },

  btn: { padding: "8px 16px", borderRadius: 8, border: "none", background: "#c084c4", color: "#fff", cursor: "pointer", fontFamily: "sans-serif", fontSize: 13 },

  postActions: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  checkbox: { display: "flex", gap: 6, alignItems: "center", fontFamily: "sans-serif", fontSize: 13, color: "#3b0764", cursor: "pointer" },
  fileLabel: {
    fontSize: 13, fontFamily: "sans-serif", color: "#9d4edd",
    cursor: "pointer", display: "flex", alignItems: "center", gap: 4
  },
  actionRow: { display: "flex", gap: 6 },
  postImage: { width: "100%", borderRadius: 12, marginTop: 10 },

  reactions: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" },
  emojiBtn: { border: "none", fontSize: 18, cursor: "pointer", borderRadius: 20, padding: "4px 8px", display: "flex", alignItems: "center", gap: 3 },
  reactionCount: { fontSize: 12, fontFamily: "sans-serif", color: "#7c3aed" },

  comments: { marginTop: 12 },

  commentBox: {
    background: "#faf5ff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },

  commentText: {
    flex: 1,
    minWidth: 0,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    fontSize: 13,
    fontFamily: "sans-serif",
    color: "#3b0764"
  },

  commentInput: {
    width: "100%",
    padding: 8,
    borderRadius: 8,
    border: "1px solid #e9d5ff",
    marginTop: 6,
    fontFamily: "sans-serif",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none"
  },

  commentBtn: {
    marginLeft: 6,
    padding: "4px 10px",
    borderRadius: 8,
    border: "none",
    background: "#e9d5ff",
    color: "#7c3aed",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "sans-serif"
  }
};