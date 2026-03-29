import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/posts";
const emojis = ["❤️", "👍", "😂", "😮", "😢"];

export default function PostPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [newPost, setNewPost] = useState({ content: "", isAnonymous: false, image: null });

  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostText, setEditPostText] = useState("");

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  // ✅ ONLY FIXED PART HERE
  const fetchPosts = async () => {
    const { data } = await axios.get(API);

    const normalized = data.map(p => ({
      ...p,
      createdAt: p.createdAt || p.timestamp   // ✅ FIX: use real stored time
    }));

    setPosts(normalized);
    normalized.forEach(p => fetchReactions(p._id));
    normalized.forEach(p => fetchComments(p._id));
  };

  const fetchReactions = async (postId) => {
    const { data } = await axios.get(`${API}/reaction/${postId}`);
    setReactions(prev => ({ ...prev, [postId]: data }));
  };

  const fetchComments = async (postId) => {
    const { data } = await axios.get(`${API}/comment/${postId}`);
    setComments(prev => ({ ...prev, [postId]: data }));
  };

  const handlePost = async () => {
    if (!newPost.content.trim() && !newPost.image) return;

    const formData = new FormData();
    formData.append("userId", user._id);
    formData.append("username", user?.name || "Unknown User");
    formData.append("content", newPost.content);
    formData.append("isAnonymous", newPost.isAnonymous);
    if (newPost.image) formData.append("image", newPost.image);

    await axios.post(API, formData, { headers: { "Content-Type": "multipart/form-data" } });
    setNewPost({ content: "", isAnonymous: false, image: null });
    fetchPosts();
  };

  const handleReaction = async (postId, emoji) => {
    await axios.post(`${API}/reaction`, { postId, userId: user._id, emoji });
    fetchReactions(postId);
  };

  const handleRemoveReaction = async (postId) => {
    await axios.delete(`${API}/reaction`, {
      data: { postId, userId: user._id }
    });
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

  useEffect(() => { fetchPosts(); }, []);

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.content}>

        <div style={S.card}>
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

            <input type="file" onChange={e => setNewPost({ ...newPost, image: e.target.files[0] })} />
            <button onClick={handlePost} style={S.btn}>Post</button>
          </div>
        </div>

        {posts.map(p => {
          const postReactions = reactions[p._id] || [];
          const postComments = comments[p._id] || [];

          const userReaction = postReactions.find(r => r.userId?.toString() === user._id)?.emoji;
          const countReactions = emojis.map(e => postReactions.filter(r => r.emoji === e).length);

          return (
            <div key={p._id} style={S.card}>
              <div style={S.postHeader}>
                <strong>
                  {p.isAnonymous ? "Anonymous User" : (p.username || "Unknown User")}
                </strong>
                <span style={S.timestamp}>{new Date(p.createdAt).toLocaleString()}</span>
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
                <p style={S.postText}>{p.content}</p>
              )}

              {p.image && <img src={`http://localhost:5000${p.image}`} style={S.postImage} alt="post" />}

              {user._id === p.userId?.toString() && (
                <div style={S.actionRow}>
                  <button onClick={() => {
                    setEditingPostId(p._id);
                    setEditPostText(p.content);
                  }} style={S.commentBtn}>Edit</button>

                  <button onClick={() => handleDeletePost(p._id)} style={S.commentBtn}>Delete</button>
                </div>
              )}

              <div style={S.reactions}>
                {emojis.map((e, i) => (
                  <button
                    key={i}
                    style={{ ...S.emojiBtn, fontWeight: userReaction === e ? "bold" : "normal" }}
                    onClick={() => handleReaction(p._id, e)}
                  >
                    {e} {countReactions[i] > 0 && countReactions[i]}
                  </button>
                ))}

                {userReaction && (
                  <button onClick={() => handleRemoveReaction(p._id)} style={S.commentBtn}>
                    Remove
                  </button>
                )}
              </div>

              <div style={S.comments}>
                {postComments.map(c => (
                  <div key={c._id} style={S.commentBox}>
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
                        <button onClick={() => {
                          setEditingCommentId(c._id);
                          setEditCommentText(c.text);
                        }} style={S.commentBtn}>Edit</button>

                        <button onClick={() => handleDeleteComment(c)} style={S.commentBtn}>
                          Delete
                        </button>
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

  postHeader: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  timestamp: { fontSize: 11, color: "#9d6b9d" },

  textarea: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e9d5ff",
    resize: "vertical",
    boxSizing: "border-box",
    marginBottom: 10
  },

  postText: { marginTop: 10, lineHeight: 1.6, wordBreak: "break-word" },

  btn: { padding: "8px 16px", borderRadius: 8, border: "none", background: "#c084c4", color: "#fff", cursor: "pointer" },

  postActions: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  checkbox: { display: "flex", gap: 6, alignItems: "center" },
  actionRow: { marginTop: 10, display: "flex", gap: 8 },
  postImage: { width: "100%", borderRadius: 12, marginTop: 10 },
  reactions: { display: "flex", gap: 12, marginTop: 12 },
  emojiBtn: { background: "transparent", border: "none", fontSize: 18, cursor: "pointer" },

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
    overflowWrap: "anywhere"
  },

  commentInput: {
    width: "100%",
    padding: 8,
    borderRadius: 8,
    border: "1px solid #e9d5ff",
    marginTop: 6
  },

  commentBtn: {
    marginLeft: 6,
    padding: "4px 8px",
    borderRadius: 6,
    border: "none",
    background: "#c084c4",
    color: "#fff",
    cursor: "pointer"
  }
};