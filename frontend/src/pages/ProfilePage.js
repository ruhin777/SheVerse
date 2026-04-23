import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_PROFILE = "http://localhost:5000/api/profile";
const API_POSTS   = "http://localhost:5000/api/posts";
const API_GROUPS  = "http://localhost:5000/api/groups";

const CLOUDINARY_CLOUD_NAME    = "dgtzgke3h";
const CLOUDINARY_UPLOAD_PRESET = "sheverse_uploads";

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  return data.secure_url;
}

const getYouTubeEmbed = (url) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

// ══════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════
export default function ProfilePage({ viewUserId, onViewProfile }) {
  const me = JSON.parse(localStorage.getItem("user") || "{}");
  // Show own profile if no viewUserId OR if viewUserId equals our own id
  const isOwn = !viewUserId || viewUserId === me._id;

  return isOwn
    ? <OwnProfilePage me={me} onViewProfile={onViewProfile} />
    : <ViewProfilePage
        viewUserId={viewUserId}
        me={me}
        onViewProfile={onViewProfile}
        onBack={() => onViewProfile && onViewProfile(null)}
      />;
}

// ══════════════════════════════════════════
//  OWN PROFILE PAGE
// ══════════════════════════════════════════
function OwnProfilePage({ me, onViewProfile }) {
  const [profile, setProfile]             = useState(null);
  const [editing, setEditing]             = useState(false);
  const [bio, setBio]                     = useState("");
  const [interests, setInterests]         = useState("");
  const [photoFile, setPhotoFile]         = useState(null);
  const [photoPreview, setPhotoPreview]   = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [posts, setPosts]                 = useState([]);
  const [groups, setGroups]               = useState([]);
  const [friends, setFriends]             = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab]         = useState("posts");
  const [toast, setToast]                 = useState("");
  const [removingFriend, setRemovingFriend] = useState(null);
  const [searchQ, setSearchQ]             = useState("");
  const [searchResults, setSearchResults] = useState([]);
  // friendStatuses keyed by userId string → { status, isSender, requestId }
  const [friendStatuses, setFriendStatuses] = useState({});
  const [showNotif, setShowNotif]         = useState(false);
  const [postReactions, setPostReactions] = useState({});
  const [postComments, setPostComments]   = useState({});
  const [newComment, setNewComment]       = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText]   = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostText, setEditPostText]   = useState("");

  // ADDED: profile pics cache — maps userId -> photo url (or null)
  const [userProfiles, setUserProfiles] = useState({});

  const fileRef  = useRef();
  const notifRef = useRef();
  const emojis   = ["❤️", "👍", "😂", "😮", "😢"];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  // ─── Fetchers ───────────────────────────

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${API_PROFILE}/${me._id}`);
      setProfile(data); setBio(data.bio || ""); setInterests(data.interests || "");
    } catch {
      try {
        const { data } = await axios.post(API_PROFILE, { userId: me._id, username: me.name });
        setProfile(data);
      } catch (e2) { console.error("Profile create failed", e2); }
    }
  };

  const fetchPosts = async () => {
    try {
      const { data } = await axios.get(API_POSTS);
      const mine = data.filter(p => p.userId?.toString() === me._id && !p.isAnonymous);
      setPosts(mine);
      mine.forEach(p => { fetchReactions(p._id); fetchComments(p._id); });
      // ADDED: fetch profile pic for own posts author (me)
      fetchUserProfile(me._id);
    } catch (e) { console.error("fetchPosts", e); }
  };

  const fetchReactions = async (postId) => {
    const { data } = await axios.get(`${API_POSTS}/reaction/${postId}`);
    setPostReactions(prev => ({ ...prev, [postId]: data }));
  };

  const fetchComments = async (postId) => {
    const { data } = await axios.get(`${API_POSTS}/comment/${postId}`);
    setPostComments(prev => ({ ...prev, [postId]: data }));
    // ADDED: fetch profile pics for all commenters
    data.forEach(c => fetchUserProfile(c.userId?.toString()));
  };

  const fetchGroups = async () => {
    const { data } = await axios.get(API_GROUPS);
    const joined = [];
    for (const g of data) {
      try {
        const { data: m } = await axios.get(`${API_GROUPS}/${g._id}/ismember/${me._id}`);
        if (m.isMember) joined.push(g);
      } catch { /* skip */ }
    }
    setGroups(joined);
  };

  const fetchFriends = async () => {
    try {
      const { data } = await axios.get(`${API_PROFILE}/friends/list/${me._id}`);
      setFriends(data);
    } catch (e) { console.error("fetchFriends", e); }
  };

  const fetchPending = async () => {
    try {
      const { data } = await axios.get(`${API_PROFILE}/friends/pending/${me._id}`);
      setPendingRequests(data);
    } catch (e) { console.error("fetchPending", e); }
  };

  useEffect(() => {
    fetchProfile(); fetchPosts(); fetchFriends(); fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (activeTab === "groups") fetchGroups(); }, [activeTab]);

  // Live search — always re-fetches statuses from DB so they are accurate
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data: results } = await axios.get(
          `${API_PROFILE}/search/users?q=${encodeURIComponent(searchQ)}&currentUserId=${me._id}`
        );
        setSearchResults(results);
        const statuses = {};
        await Promise.all(results.map(async (u) => {
          const uid = u.userId.toString();
          const { data: s } = await axios.get(`${API_PROFILE}/friends/status/${me._id}/${uid}`);
          statuses[uid] = s; // { status, requestId, isSender }
        }));
        setFriendStatuses(statuses);
      } catch (e) { console.error("search", e); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  // ─── Profile save ────────────────────────

  const handleSaveProfile = async () => {
    setUploading(true);
    try {
      let photoUrl = profile?.photo || null;
      if (photoFile) photoUrl = await uploadToCloudinary(photoFile);
      const { data } = await axios.post(API_PROFILE, { userId: me._id, username: me.name, photo: photoUrl, bio, interests });
      setProfile(data); setPhotoFile(null); setPhotoPreview(null); setEditing(false);
      showToast("Profile updated! ✨");
    } catch { showToast("Failed to update profile."); }
    finally { setUploading(false); }
  };

  // ─── Notification bell handlers ──────────

  const handleAcceptFromNotif = async (requestId, senderName) => {
    try {
      await axios.put(`${API_PROFILE}/friends/request/${requestId}`, { status: "accepted", userId: me._id });
      showToast(`You are now friends with ${senderName}! 🎉`);
      fetchFriends(); fetchPending();
    } catch { showToast("Failed to accept."); }
  };

  const handleRejectFromNotif = async (requestId) => {
    try {
      await axios.put(`${API_PROFILE}/friends/request/${requestId}`, { status: "rejected", userId: me._id });
      showToast("Request rejected.");
      fetchPending();
    } catch { showToast("Failed to reject."); }
  };

  // ─── Friends list ─────────────────────────

  const handleRemoveFriend = async (friendUserId) => {
    try {
      await axios.delete(`${API_PROFILE}/friends/${me._id}/${friendUserId}`);
      setRemovingFriend(null); showToast("Friend removed."); fetchFriends();
    } catch { showToast("Failed to remove friend."); }
  };

  // ─── Search bar friend actions ────────────
  // CRITICAL FIX: store requestId from the POST response

  const handleSendRequest = async (targetUserId) => {
    try {
      const { data } = await axios.post(`${API_PROFILE}/friends/request`, { senderId: me._id, receiverId: targetUserId });
      // Store _id from the created FriendRequest document so cancel works
      setFriendStatuses(prev => ({
        ...prev,
        [targetUserId]: { status: "pending", isSender: true, requestId: data._id }
      }));
      showToast("Friend request sent! ✉️");
    } catch (err) { showToast(err?.response?.data?.error || "Failed to send request."); }
  };

  const handleCancelRequest = async (targetUserId) => {
    const st = friendStatuses[targetUserId];
    if (!st?.requestId) { showToast("Cannot find request to cancel."); return; }
    try {
      await axios.delete(`${API_PROFILE}/friends/request/${st.requestId}`, { data: { userId: me._id } });
      setFriendStatuses(prev => ({ ...prev, [targetUserId]: { status: "none" } }));
      showToast("Request cancelled.");
    } catch { showToast("Failed to cancel request."); }
  };

  const handleAcceptFromSearch = async (targetUserId, username) => {
    const st = friendStatuses[targetUserId];
    if (!st?.requestId) return;
    try {
      await axios.put(`${API_PROFILE}/friends/request/${st.requestId}`, { status: "accepted", userId: me._id });
      setFriendStatuses(prev => ({ ...prev, [targetUserId]: { status: "accepted" } }));
      showToast(`You are now friends with ${username}! 🎉`);
      fetchFriends(); fetchPending();
    } catch { showToast("Failed to accept request."); }
  };

  const handleRejectFromSearch = async (targetUserId) => {
    const st = friendStatuses[targetUserId];
    if (!st?.requestId) return;
    try {
      await axios.put(`${API_PROFILE}/friends/request/${st.requestId}`, { status: "rejected", userId: me._id });
      setFriendStatuses(prev => ({ ...prev, [targetUserId]: { status: "none" } }));
      showToast("Request rejected."); fetchPending();
    } catch { showToast("Failed to reject request."); }
  };

  // ─── Post / comment actions ───────────────

  const handleReaction = async (postId, emoji) => {
    await axios.post(`${API_POSTS}/reaction`, { postId, userId: me._id, emoji });
    fetchReactions(postId);
  };
  const handleRemoveReaction = async (postId) => {
    await axios.delete(`${API_POSTS}/reaction`, { data: { postId, userId: me._id } });
    fetchReactions(postId);
  };
  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    await axios.post(`${API_POSTS}/comment`, { postId, userId: me._id, username: me.name, text: newComment[postId] });
    setNewComment(prev => ({ ...prev, [postId]: "" })); fetchComments(postId);
  };
  const handleSaveComment = async (comment) => {
    await axios.put(`${API_POSTS}/comment/${comment._id}`, { text: editCommentText, userId: me._id });
    setEditingCommentId(null); fetchComments(comment.postId);
  };
  const handleDeleteComment = async (comment) => {
    await axios.delete(`${API_POSTS}/comment/${comment._id}/${me._id}`);
    fetchComments(comment.postId);
  };
  const handleSavePost = async (postId) => {
    await axios.put(`${API_POSTS}/${postId}`, { content: editPostText, userId: me._id });
    setEditingPostId(null); fetchPosts();
  };
  const handleDeletePost = async (postId) => {
    await axios.delete(`${API_POSTS}/${postId}/${me._id}`); fetchPosts();
  };

  const displayPhoto = photoPreview || profile?.photo;

  return (
    <div style={S.wrapper}>
      <div style={S.bg} /><div style={S.overlay} />
      {toast && <div style={S.toast}>{toast}</div>}

      {/* ── Remove Friend Modal ── */}
      {removingFriend && (
        <div style={S.modalOverlay} onClick={() => setRemovingFriend(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Remove Friend?</h3>
            <p style={S.modalDesc}>
              Are you sure you want to remove{" "}
              <strong>{friends.find(f => f.userId?.toString() === removingFriend)?.username}</strong>?
            </p>
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => setRemovingFriend(null)}>No, Keep</button>
              <button style={S.dangerBtn} onClick={() => handleRemoveFriend(removingFriend)}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      <div style={S.content}>

        {/* ── Profile Card ── */}
        <div style={S.profileCard}>
          <div style={S.coverStrip} />
          <div style={S.profileBody}>

            {/* 🔔 Notification Bell */}
            <div style={S.notifWrap} ref={notifRef}>
              <button style={S.notifBtn} onClick={() => { setShowNotif(p => !p); fetchPending(); }}>
                🔔
                {pendingRequests.length > 0 && (
                  <span style={S.notifBadge}>{pendingRequests.length}</span>
                )}
              </button>
              {showNotif && (
                <div style={S.notifDropdown}>
                  <div style={S.notifHeader}>Friend Requests</div>
                  {pendingRequests.length === 0 && <div style={S.notifEmpty}>No pending requests</div>}
                  {pendingRequests.map(req => (
                    <div key={req._id} style={S.notifItem}>
                      <div style={S.sAvWrap}>
                        {req.senderProfile?.photo
                          ? <img src={req.senderProfile.photo} style={S.sAvImg} alt="" />
                          : <div style={S.sAvFallback}>{(req.senderProfile?.username || "U")[0].toUpperCase()}</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.notifText}>
                          <strong>{req.senderProfile?.username || "Someone"}</strong> sent you a friend request
                        </div>
                        <div style={S.notifBtns}>
                          <button style={S.acceptBtn} onClick={() => handleAcceptFromNotif(req._id, req.senderProfile?.username || "")}>Accept</button>
                          <button style={S.rejectBtn} onClick={() => handleRejectFromNotif(req._id)}>Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div style={S.avatarWrap}>
              <div style={S.avatarRing}>
                {displayPhoto
                  ? <img src={displayPhoto} style={S.avatarImg} alt="profile" />
                  : <div style={S.avatarFallback}>{me.name?.[0]?.toUpperCase()}</div>
                }
              </div>
              {editing && (
                <>
                  <button style={S.changePhotoBtn} onClick={() => fileRef.current.click()}>📷 Change Photo</button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files[0]; if (!file) return;
                    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
                  }} />
                </>
              )}
            </div>

            {/* Info */}
            <div style={S.profileInfo}>
              <h2 style={S.profileName}>{me.name}</h2>
              <p style={S.profileEmail}>{me.email}</p>
              {editing ? (
                <div style={S.editForm}>
                  <label style={S.editLabel}>Bio</label>
                  <textarea style={S.editTextarea} placeholder="Tell the world about yourself..." value={bio} onChange={e => setBio(e.target.value)} />
                  <label style={S.editLabel}>Interests</label>
                  <textarea style={S.editTextarea} placeholder="Travel, books, yoga..." value={interests} onChange={e => setInterests(e.target.value)} />
                  <div style={S.editBtns}>
                    <button style={S.cancelBtn} onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null); }}>Cancel</button>
                    <button style={S.saveBtn} onClick={handleSaveProfile} disabled={uploading}>{uploading ? "Saving..." : "Save Profile"}</button>
                  </div>
                </div>
              ) : (
                <>
                  {profile?.bio && <p style={S.profileBio}>{profile.bio}</p>}
                  {profile?.interests && <p style={S.profileInterests}><span style={S.interestLabel}>Interests: </span>{profile.interests}</p>}
                  <button style={S.editProfileBtn} onClick={() => setEditing(true)}>✏️ Edit Profile</button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={S.statsRow}>
            <div style={S.statItem}><span style={S.statNum}>{posts.length}</span><span style={S.statLbl}>Posts</span></div>
            <div style={S.statDivider} />
            <div style={S.statItem}><span style={S.statNum}>{friends.length}</span><span style={S.statLbl}>Friends</span></div>
            <div style={S.statDivider} />
            <div style={S.statItem}><span style={S.statNum}>{groups.length || "—"}</span><span style={S.statLbl}>Groups</span></div>
          </div>
        </div>

        {/* ── Find People ── */}
        <div style={S.card}>
          <div style={S.cardTitle}>🔍 Find People</div>
          <input style={S.searchInput} placeholder="Search by name..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          {searchResults.map(u => {
            const uid = u.userId.toString();
            const st  = friendStatuses[uid] || { status: "none" };
            return (
              <div key={uid} style={S.searchResultItem}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
                  onClick={() => onViewProfile && onViewProfile(uid)}>
                  <div style={S.sAvWrap}>
                    {u.photo ? <img src={u.photo} style={S.sAvImg} alt="" /> : <div style={S.sAvFallback}>{(u.username || "U")[0].toUpperCase()}</div>}
                  </div>
                  <span style={{ fontSize: 14, fontFamily: "sans-serif", color: "#3b0764", textDecoration: "underline", textDecorationColor: "#c084c4" }}>{u.username}</span>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {st.status === "none" && <button style={S.addFriendBtn} onClick={() => handleSendRequest(uid)}>+ Add Friend</button>}
                  {st.status === "pending" && st.isSender && <button style={S.pendingBtn} onClick={() => handleCancelRequest(uid)}>Pending ✕</button>}
                  {st.status === "pending" && !st.isSender && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={S.acceptBtn} onClick={() => handleAcceptFromSearch(uid, u.username)}>Accept</button>
                      <button style={S.rejectBtn} onClick={() => handleRejectFromSearch(uid)}>Reject</button>
                    </div>
                  )}
                  {st.status === "accepted" && <span style={{ ...S.statusChip, background: "#d1fae5", color: "#065f46" }}>Friends ✓</span>}
                  {/* If rejected allow re-sending */}
                  {st.status === "rejected" && <button style={S.addFriendBtn} onClick={() => handleSendRequest(uid)}>+ Add Friend</button>}
                </div>
              </div>
            );
          })}
          {searchQ.trim() && searchResults.length === 0 && <div style={S.emptySmall}>No users found.</div>}
        </div>

        {/* ── Tabs ── */}
        <div style={S.tabs}>
          {["posts", "friends", "groups"].map(tab => (
            <button key={tab} style={{ ...S.tab, ...(activeTab === tab ? S.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
              {tab === "posts" ? "📝 Posts" : tab === "friends" ? "👥 Friends" : "🏘️ Groups"}
            </button>
          ))}
        </div>

        {/* ── Posts Tab ── */}
        {activeTab === "posts" && (
          <div>
            {posts.length === 0 && <div style={S.empty}>No public posts yet.</div>}
            {posts.map(p => {
              const reactions = postReactions[p._id] || [];
              const comments  = postComments[p._id]  || [];
              const userReaction   = reactions.find(r => r.userId?.toString() === me._id)?.emoji;
              const countReactions = emojis.map(e => reactions.filter(r => r.emoji === e).length);
              return (
                <div key={p._id} style={S.card}>
                  {/* ADDED: post header with author avatar and username */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {renderAvatar(me._id, me.name)}
                      <div>
                        <strong style={{ fontSize: 14, color: "#3b0764", fontFamily: "sans-serif" }}>{me.name}</strong>
                        <div style={{ fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif" }}>{new Date(p.createdAt || p.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={S.commentBtn} onClick={() => { setEditingPostId(p._id); setEditPostText(p.content); }}>Edit</button>
                      <button style={{ ...S.commentBtn, color: "#e11d48" }} onClick={() => handleDeletePost(p._id)}>Delete</button>
                    </div>
                  </div>
                  {editingPostId === p._id ? (
                    <>
                      <textarea value={editPostText} onChange={e => setEditPostText(e.target.value)} style={S.editTextarea} />
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button style={S.commentBtn} onClick={() => handleSavePost(p._id)}>Save</button>
                        <button style={S.commentBtn} onClick={() => setEditingPostId(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <p style={S.postText}>
                      {p.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                        const embed = getYouTubeEmbed(part);
                        if (embed) return <iframe key={i} width="100%" height="200" src={embed} frameBorder="0" allowFullScreen style={{ borderRadius: 8, marginTop: 6, display: "block" }} />;
                        if (part.match(/https?:\/\/[^\s]+/)) return <a key={i} href={part} target="_blank" rel="noreferrer" style={S.postLink}>{part}</a>;
                        return part;
                      })}
                    </p>
                  )}
                  {p.image && <img src={p.image} style={{ width: "100%", borderRadius: 10, marginTop: 8 }} alt="post" />}
                  <div style={S.reactions}>
                    {emojis.map((e, i) => (
                      <button key={i} style={{ ...S.emojiBtn, fontWeight: userReaction === e ? "bold" : "normal", background: userReaction === e ? "#f3e8ff" : "transparent" }}
                        onClick={() => handleReaction(p._id, e)}>
                        {e} {countReactions[i] > 0 && <span style={S.reactionCount}>{countReactions[i]}</span>}
                      </button>
                    ))}
                    {userReaction && <button onClick={() => handleRemoveReaction(p._id)} style={S.commentBtn}>Remove</button>}
                  </div>
                  <div style={S.commentsWrap}>
                    {comments.map(c => (
                      <div key={c._id} style={S.commentBox}>
                        {/* ADDED: commenter profile pic or avatar fallback */}
                        {renderAvatar(c.userId?.toString(), c.username)}
                        <div style={S.commentText}>
                          {editingCommentId === c._id ? (
                            <><input value={editCommentText} onChange={e => setEditCommentText(e.target.value)} style={S.commentInput} /><button onClick={() => handleSaveComment(c)} style={S.commentBtn}>Save</button></>
                          ) : (
                            <><strong>{c.username}</strong>: {c.text}</>
                          )}
                        </div>
                        {c.userId?.toString() === me._id && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button style={S.commentBtn} onClick={() => { setEditingCommentId(c._id); setEditCommentText(c.text); }}>Edit</button>
                            <button style={S.commentBtn} onClick={() => handleDeleteComment(c)}>Delete</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <input placeholder="Write a comment..." value={newComment[p._id] || ""} onChange={e => setNewComment(prev => ({ ...prev, [p._id]: e.target.value }))} style={S.commentInput} />
                    <button onClick={() => handleAddComment(p._id)} style={S.commentBtn}>Comment</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Friends Tab ── */}
        {activeTab === "friends" && (
          <div style={S.card}>
            {friends.length === 0 && <div style={S.empty}>No friends yet. Use Find People to connect!</div>}
            {friends.map(f => (
              <div key={f.userId?.toString()} style={S.friendItem}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
                  onClick={() => onViewProfile && onViewProfile(f.userId?.toString())}>
                  <div style={S.sAvWrap}>
                    {f.photo ? <img src={f.photo} style={S.sAvImg} alt="" /> : <div style={S.sAvFallback}>{(f.username || "U")[0].toUpperCase()}</div>}
                  </div>
                  <span style={{ ...S.friendName, textDecoration: "underline", textDecorationColor: "#c084c4" }}>{f.username}</span>
                </div>
                <button style={S.removeFriendBtn} onClick={() => setRemovingFriend(f.userId?.toString())}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Groups Tab ── */}
        {activeTab === "groups" && (
          <div style={S.card}>
            {groups.length === 0 && <div style={S.empty}>No groups joined yet.</div>}
            {groups.map(g => (
              <div key={g._id} style={S.groupItem}>
                <div style={S.groupIcon}>{g.name[0].toUpperCase()}</div>
                <div><div style={S.groupName}>{g.name}</div><div style={S.groupCat}>{g.category}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  VIEW SOMEONE ELSE'S PROFILE
// ══════════════════════════════════════════
function ViewProfilePage({ viewUserId, me, onViewProfile, onBack }) {
  const [profile, setProfile]           = useState(null);
  const [posts, setPosts]               = useState([]);
  const [groups, setGroups]             = useState([]);
  const [friendStatus, setFriendStatus] = useState({ status: "none" });
  const [friends, setFriends]           = useState([]);
  const [activeTab, setActiveTab]       = useState("posts");
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState("");
  const [postReactions, setPostReactions] = useState({});
  const [postComments, setPostComments]   = useState({});
  const [newComment, setNewComment]       = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText]   = useState("");

  // ADDED: profile pics cache — maps userId -> photo url (or null)
  const [userProfiles, setUserProfiles] = useState({});

  const emojis = ["❤️", "👍", "😂", "😮", "😢"];
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profRes, postsRes, statusRes, friendsRes] = await Promise.all([
        axios.get(`${API_PROFILE}/${viewUserId}`),
        axios.get(API_POSTS),
        axios.get(`${API_PROFILE}/friends/status/${me._id}/${viewUserId}`),
        axios.get(`${API_PROFILE}/friends/list/${viewUserId}`),
      ]);
      setProfile(profRes.data);
      const theirPosts = postsRes.data.filter(p => p.userId?.toString() === viewUserId && !p.isAnonymous);
      setPosts(theirPosts);
      setFriendStatus(statusRes.data);
      setFriends(friendsRes.data);
      theirPosts.forEach(p => { fetchReactions(p._id); fetchComments(p._id); });
      // ADDED: fetch profile pic for the viewed user (post author)
      fetchUserProfile(viewUserId);
    } catch (e) { console.error("ViewProfile fetchAll", e); showToast("Could not load profile."); }
    finally { setLoading(false); }
  };

  const fetchReactions = async (postId) => {
    const { data } = await axios.get(`${API_POSTS}/reaction/${postId}`);
    setPostReactions(prev => ({ ...prev, [postId]: data }));
  };
  const fetchComments = async (postId) => {
    const { data } = await axios.get(`${API_POSTS}/comment/${postId}`);
    setPostComments(prev => ({ ...prev, [postId]: data }));
    // ADDED: fetch profile pics for all commenters
    data.forEach(c => fetchUserProfile(c.userId?.toString()));
  };

  useEffect(() => { fetchAll(); }, [viewUserId]);

  useEffect(() => {
    if (activeTab !== "groups") return;
    (async () => {
      const { data } = await axios.get(API_GROUPS);
      const joined = [];
      for (const g of data) {
        try {
          const { data: m } = await axios.get(`${API_GROUPS}/${g._id}/ismember/${viewUserId}`);
          if (m.isMember) joined.push(g);
        } catch { /* skip */ }
      }
      setGroups(joined);
    })();
  }, [activeTab, viewUserId]);

  const handleSendRequest = async () => {
    try {
      const { data } = await axios.post(`${API_PROFILE}/friends/request`, { senderId: me._id, receiverId: viewUserId });
      setFriendStatus({ status: "pending", isSender: true, requestId: data._id });
      showToast("Friend request sent! ✉️");
    } catch (err) { showToast(err?.response?.data?.error || "Failed to send request."); }
  };
  const handleCancelRequest = async () => {
    if (!friendStatus.requestId) return;
    try {
      await axios.delete(`${API_PROFILE}/friends/request/${friendStatus.requestId}`, { data: { userId: me._id } });
      setFriendStatus({ status: "none" }); showToast("Request cancelled.");
    } catch { showToast("Failed to cancel."); }
  };
  const handleAcceptRequest = async () => {
    if (!friendStatus.requestId) return;
    try {
      await axios.put(`${API_PROFILE}/friends/request/${friendStatus.requestId}`, { status: "accepted", userId: me._id });
      showToast(`You are now friends with ${profile?.username}! 🎉`);
      setFriendStatus({ status: "accepted" }); fetchAll();
    } catch { showToast("Failed to accept."); }
  };
  const handleRejectRequest = async () => {
    if (!friendStatus.requestId) return;
    try {
      await axios.put(`${API_PROFILE}/friends/request/${friendStatus.requestId}`, { status: "rejected", userId: me._id });
      setFriendStatus({ status: "rejected_by_me" }); showToast("Request rejected.");
    } catch { showToast("Failed to reject."); }
  };
  const handleUnfriend = async () => {
    try {
      await axios.delete(`${API_PROFILE}/friends/${me._id}/${viewUserId}`);
      setFriendStatus({ status: "none" }); showToast("Friend removed.");
    } catch { showToast("Failed to remove friend."); }
  };

  const handleReaction = async (postId, emoji) => {
    await axios.post(`${API_POSTS}/reaction`, { postId, userId: me._id, emoji }); fetchReactions(postId);
  };
  const handleRemoveReaction = async (postId) => {
    await axios.delete(`${API_POSTS}/reaction`, { data: { postId, userId: me._id } }); fetchReactions(postId);
  };
  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    await axios.post(`${API_POSTS}/comment`, { postId, userId: me._id, username: me.name, text: newComment[postId] });
    setNewComment(prev => ({ ...prev, [postId]: "" })); fetchComments(postId);
  };
  const handleSaveComment = async (comment) => {
    await axios.put(`${API_POSTS}/comment/${comment._id}`, { text: editCommentText, userId: me._id });
    setEditingCommentId(null); fetchComments(comment.postId);
  };
  const handleDeleteComment = async (comment) => {
    await axios.delete(`${API_POSTS}/comment/${comment._id}/${me._id}`); fetchComments(comment.postId);
  };

  const isFriend = friendStatus.status === "accepted";

  if (loading) return <div style={{ textAlign: "center", marginTop: 80, color: "#9d6b9d", fontFamily: "sans-serif" }}>Loading profile...</div>;
  if (!profile) return (
    <div style={S.wrapper}><div style={S.bg} /><div style={S.overlay} />
      <div style={S.content}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <div style={{ textAlign: "center", marginTop: 60, color: "#9d6b9d", fontFamily: "sans-serif" }}>Profile not found.</div>
      </div>
    </div>
  );

  return (
    <div style={S.wrapper}>
      <div style={S.bg} /><div style={S.overlay} />
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.content}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>

        <div style={S.profileCard}>
          <div style={S.coverStrip} />
          <div style={S.profileBody}>
            <div style={S.avatarWrap}>
              <div style={S.avatarRing}>
                {profile.photo ? <img src={profile.photo} style={S.avatarImg} alt="profile" /> : <div style={S.avatarFallback}>{profile.username?.[0]?.toUpperCase()}</div>}
              </div>
            </div>
            <div style={S.profileInfo}>
              <h2 style={S.profileName}>{profile.username}</h2>
              {profile.bio && <p style={S.profileBio}>{profile.bio}</p>}
              {profile.interests && <p style={S.profileInterests}><span style={S.interestLabel}>Interests: </span>{profile.interests}</p>}
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {friendStatus.status === "none" && <button style={S.addFriendBtn} onClick={handleSendRequest}>+ Add Friend</button>}
                {friendStatus.status === "pending" && friendStatus.isSender && <button style={S.pendingBtn} onClick={handleCancelRequest}>Pending ✕</button>}
                {friendStatus.status === "pending" && !friendStatus.isSender && (
                  <><button style={S.acceptBtn} onClick={handleAcceptRequest}>Accept Request</button><button style={S.rejectBtn} onClick={handleRejectRequest}>Reject</button></>
                )}
                {friendStatus.status === "accepted" && <button style={S.removeFriendBtn} onClick={handleUnfriend}>Unfriend</button>}
                {friendStatus.status === "rejected" && <button style={S.addFriendBtn} onClick={handleSendRequest}>+ Add Friend</button>}
                {friendStatus.status === "rejected_by_me" && <span style={{ fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif" }}>Request rejected</span>}
              </div>
            </div>
          </div>
          <div style={S.statsRow}>
            <div style={S.statItem}><span style={S.statNum}>{posts.length}</span><span style={S.statLbl}>Posts</span></div>
            <div style={S.statDivider} />
            <div style={S.statItem}><span style={S.statNum}>{friends.length}</span><span style={S.statLbl}>Friends</span></div>
          </div>
        </div>

        {isFriend ? (
          <>
            <div style={S.tabs}>
              {["posts", "friends", "groups"].map(tab => (
                <button key={tab} style={{ ...S.tab, ...(activeTab === tab ? S.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
                  {tab === "posts" ? "📝 Posts" : tab === "friends" ? "👥 Friends" : "🏘️ Groups"}
                </button>
              ))}
            </div>

            {activeTab === "posts" && (
              <div>
                {posts.length === 0 && <div style={S.empty}>No public posts yet.</div>}
                {posts.map(p => {
                  const reactions = postReactions[p._id] || [];
                  const comments  = postComments[p._id]  || [];
                  const userReaction   = reactions.find(r => r.userId?.toString() === me._id)?.emoji;
                  const countReactions = emojis.map(e => reactions.filter(r => r.emoji === e).length);
                  return (
                    <div key={p._id} style={S.card}>
                      {/* ADDED: post header with author avatar and username */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        {renderAvatar(viewUserId, profile.username)}
                        <div>
                          <strong style={{ fontSize: 14, color: "#3b0764", fontFamily: "sans-serif" }}>{profile.username}</strong>
                          <div style={{ fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif" }}>{new Date(p.createdAt || p.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <p style={S.postText}>
                        {p.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                          const embed = getYouTubeEmbed(part);
                          if (embed) return <iframe key={i} width="100%" height="200" src={embed} frameBorder="0" allowFullScreen style={{ borderRadius: 8, marginTop: 6, display: "block" }} />;
                          if (part.match(/https?:\/\/[^\s]+/)) return <a key={i} href={part} target="_blank" rel="noreferrer" style={S.postLink}>{part}</a>;
                          return part;
                        })}
                      </p>
                      {p.image && <img src={p.image} style={{ width: "100%", borderRadius: 10, marginTop: 8 }} alt="post" />}
                      <div style={S.reactions}>
                        {emojis.map((e, i) => (
                          <button key={i} style={{ ...S.emojiBtn, fontWeight: userReaction === e ? "bold" : "normal", background: userReaction === e ? "#f3e8ff" : "transparent" }}
                            onClick={() => handleReaction(p._id, e)}>
                            {e} {countReactions[i] > 0 && <span style={S.reactionCount}>{countReactions[i]}</span>}
                          </button>
                        ))}
                        {userReaction && <button onClick={() => handleRemoveReaction(p._id)} style={S.commentBtn}>Remove</button>}
                      </div>
                      <div style={S.commentsWrap}>
                        {comments.map(c => (
                          <div key={c._id} style={S.commentBox}>
                            {/* ADDED: commenter profile pic or avatar fallback */}
                            {renderAvatar(c.userId?.toString(), c.username)}
                            <div style={S.commentText}>
                              {editingCommentId === c._id ? (
                                <><input value={editCommentText} onChange={e => setEditCommentText(e.target.value)} style={S.commentInput} /><button onClick={() => handleSaveComment(c)} style={S.commentBtn}>Save</button></>
                              ) : <><strong>{c.username}</strong>: {c.text}</>}
                            </div>
                            {c.userId?.toString() === me._id && (
                              <div style={{ display: "flex", gap: 4 }}>
                                <button style={S.commentBtn} onClick={() => { setEditingCommentId(c._id); setEditCommentText(c.text); }}>Edit</button>
                                <button style={S.commentBtn} onClick={() => handleDeleteComment(c)}>Delete</button>
                              </div>
                            )}
                          </div>
                        ))}
                        <input placeholder="Write a comment..." value={newComment[p._id] || ""} onChange={e => setNewComment(prev => ({ ...prev, [p._id]: e.target.value }))} style={S.commentInput} />
                        <button onClick={() => handleAddComment(p._id)} style={S.commentBtn}>Comment</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "friends" && (
              <div style={S.card}>
                {friends.length === 0 && <div style={S.empty}>No friends yet.</div>}
                {friends.map(f => (
                  <div key={f.userId?.toString()} style={S.friendItem}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }} onClick={() => onViewProfile && onViewProfile(f.userId?.toString())}>
                      <div style={S.sAvWrap}>
                        {f.photo ? <img src={f.photo} style={S.sAvImg} alt="" /> : <div style={S.sAvFallback}>{(f.username || "U")[0].toUpperCase()}</div>}
                      </div>
                      <span style={{ ...S.friendName, textDecoration: "underline", textDecorationColor: "#c084c4" }}>{f.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "groups" && (
              <div style={S.card}>
                {groups.length === 0 && <div style={S.empty}>No groups joined yet.</div>}
                {groups.map(g => (
                  <div key={g._id} style={S.groupItem}>
                    <div style={S.groupIcon}>{g.name[0].toUpperCase()}</div>
                    <div><div style={S.groupName}>{g.name}</div><div style={S.groupCat}>{g.category}</div></div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ ...S.card, textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14, padding: 32 }}>
            🔒 Become friends to see {profile.username}'s posts, friends and groups.
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════
const S = {
  wrapper: { position: "relative", minHeight: "100vh", fontFamily: "Georgia, serif" },
  bg: { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(0.5px)", transform: "scale(1.1)", zIndex: -2 },
  overlay: { position: "fixed", inset: 0, background: "rgba(255,245,250,0.72)", zIndex: -1 },
  content: { maxWidth: 680, margin: "0 auto", padding: "24px 16px", position: "relative", zIndex: 1 },
  toast: { position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "#fff", padding: "12px 28px", borderRadius: 30, fontSize: 14, fontFamily: "sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.3)", zIndex: 999 },
  backBtn: { background: "transparent", border: "none", color: "#9d4edd", cursor: "pointer", fontSize: 14, fontFamily: "sans-serif", padding: "6px 0", marginBottom: 12, display: "block" },
  profileCard: { background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 6px 24px rgba(157,107,157,0.15)", marginBottom: 20, border: "1px solid #f3e8ff" },
  coverStrip: { height: 90, background: "linear-gradient(135deg, #c084c4 0%, #e879a8 50%, #9d4edd 100%)" },
  profileBody: { padding: "0 24px 20px", position: "relative" },
  notifWrap: { position: "absolute", top: 12, right: 16, zIndex: 10 },
  notifBtn: { background: "transparent", border: "none", fontSize: 20, cursor: "pointer", position: "relative", padding: 4 },
  notifBadge: { position: "absolute", top: -2, right: -2, background: "#e11d48", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center" },
  notifDropdown: { position: "absolute", right: 0, top: "110%", background: "#fff", border: "1px solid #f3e8ff", borderRadius: 14, boxShadow: "0 8px 30px rgba(157,107,157,0.2)", minWidth: 300, zIndex: 200, padding: 8 },
  notifHeader: { fontSize: 13, fontWeight: 600, color: "#3b0764", fontFamily: "sans-serif", padding: "6px 12px 10px", borderBottom: "1px solid #f3e8ff" },
  notifEmpty: { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", padding: "12px", textAlign: "center" },
  notifItem: { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 8px", borderBottom: "1px solid #f9f0ff" },
  notifText: { fontSize: 13, fontFamily: "sans-serif", color: "#3b0764", lineHeight: 1.4, marginBottom: 6 },
  notifBtns: { display: "flex", gap: 6 },
  avatarWrap: { position: "relative", marginTop: -48, marginBottom: 12, display: "inline-block" },
  avatarRing: { width: 96, height: 96, borderRadius: "50%", border: "4px solid #fff", boxShadow: "0 4px 16px rgba(157,107,157,0.3)", overflow: "hidden", background: "linear-gradient(135deg, #e879a8, #c084c4)", display: "flex", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  avatarFallback: { color: "#fff", fontSize: 36, fontWeight: "bold", fontFamily: "sans-serif" },
  changePhotoBtn: { display: "block", marginTop: 6, fontSize: 12, fontFamily: "sans-serif", color: "#9d4edd", background: "transparent", border: "none", cursor: "pointer", padding: 0 },
  profileInfo: { paddingTop: 8 },
  profileName: { fontSize: 22, color: "#3b0764", fontFamily: "Georgia, serif", margin: "0 0 2px" },
  profileEmail: { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", margin: "0 0 10px" },
  profileBio: { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif", lineHeight: 1.6, margin: "0 0 8px" },
  profileInterests: { fontSize: 13, color: "#7c3aed", fontFamily: "sans-serif", margin: "0 0 10px" },
  interestLabel: { fontWeight: 600, color: "#9d6b9d" },
  editForm: { marginTop: 8 },
  editLabel: { display: "block", fontSize: 11, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4, marginTop: 10 },
  editTextarea: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e9d5ff", fontFamily: "sans-serif", fontSize: 14, color: "#3b0764", resize: "vertical", boxSizing: "border-box", outline: "none", minHeight: 70 },
  editBtns: { display: "flex", gap: 10, marginTop: 14 },
  editProfileBtn: { marginTop: 4, padding: "8px 18px", borderRadius: 20, border: "1px solid #e9d5ff", background: "transparent", color: "#7c3aed", cursor: "pointer", fontSize: 13, fontFamily: "sans-serif" },
  statsRow: { display: "flex", justifyContent: "center", borderTop: "1px solid #f3e8ff", padding: "14px 0" },
  statItem: { flex: 1, textAlign: "center" },
  statNum: { display: "block", fontSize: 20, fontWeight: "bold", color: "#3b0764", fontFamily: "Georgia, serif" },
  statLbl: { display: "block", fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, background: "#f3e8ff", alignSelf: "stretch" },
  card: { background: "#fff", padding: 20, marginBottom: 16, borderRadius: 14, boxShadow: "0 4px 16px rgba(157,107,157,0.1)", border: "1px solid #f3e8ff" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#3b0764", fontFamily: "sans-serif", marginBottom: 12 },
  searchInput: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e9d5ff", fontFamily: "sans-serif", fontSize: 14, color: "#3b0764", boxSizing: "border-box", outline: "none", marginBottom: 8 },
  searchResultItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f9f0ff" },
  addFriendBtn: { padding: "6px 14px", borderRadius: 20, border: "none", background: "linear-gradient(135deg, #c084c4, #9d4edd)", color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  pendingBtn: { padding: "6px 14px", borderRadius: 20, border: "1px solid #c084c4", background: "transparent", color: "#9d4edd", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  acceptBtn: { padding: "6px 14px", borderRadius: 20, border: "none", background: "linear-gradient(135deg, #c084c4, #9d4edd)", color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  rejectBtn: { padding: "6px 14px", borderRadius: 20, border: "1px solid #e9d5ff", background: "transparent", color: "#9d6b9d", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  statusChip: { padding: "5px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", background: "#f3e8ff", color: "#7c3aed" },
  tabs: { display: "flex", marginBottom: 16, background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #f3e8ff" },
  tab: { flex: 1, padding: "12px 0", border: "none", background: "transparent", color: "#9d6b9d", cursor: "pointer", fontSize: 13, fontFamily: "sans-serif" },
  tabActive: { background: "linear-gradient(135deg, #f3e8ff, #fdf4ff)", color: "#7c3aed", fontWeight: 600 },
  friendItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f9f0ff" },
  sAvWrap: { width: 40, height: 40, borderRadius: "50%", overflow: "hidden", flexShrink: 0 },
  sAvImg: { width: "100%", height: "100%", objectFit: "cover" },
  sAvFallback: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #e879a8, #c084c4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold", fontFamily: "sans-serif" },
  friendName: { flex: 1, fontSize: 14, fontFamily: "sans-serif", color: "#3b0764" },
  removeFriendBtn: { padding: "5px 12px", borderRadius: 12, border: "1px solid #fecaca", background: "transparent", color: "#e11d48", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  groupItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f9f0ff" },
  groupIcon: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #c084c4, #7c3aed)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold", flexShrink: 0, fontFamily: "sans-serif" },
  groupName: { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 500 },
  groupCat: { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", marginTop: 2 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(59,7,100,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 },
  modal: { background: "#fff", borderRadius: 20, padding: 32, width: "90%", maxWidth: 400, boxShadow: "0 20px 60px rgba(124,58,237,0.25)" },
  modalTitle: { fontSize: 20, color: "#3b0764", fontFamily: "Georgia, serif", marginBottom: 12, textAlign: "center" },
  modalDesc: { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14, marginBottom: 24, lineHeight: 1.6 },
  modalBtns: { display: "flex", gap: 12 },
  cancelBtn: { flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #e9d5ff", background: "transparent", color: "#9d6b9d", cursor: "pointer", fontSize: 14, fontFamily: "sans-serif" },
  saveBtn: { flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #c084c4, #9d4edd)", color: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "sans-serif", boxShadow: "0 4px 14px rgba(157,107,157,0.3)" },
  dangerBtn: { flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#e11d48,#be123c)", color: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "sans-serif" },
  postAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #e879a8, #c084c4)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: "bold", flexShrink: 0
  },
  postText: { fontFamily: "sans-serif", fontSize: 14, color: "#3b0764", lineHeight: 1.6, wordBreak: "break-word", margin: "0 0 8px" },
  postLink: { color: "#7c3aed", fontSize: 13, fontFamily: "sans-serif", wordBreak: "break-all", textDecoration: "none" },
  reactions: { display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" },
  emojiBtn: { border: "none", fontSize: 17, cursor: "pointer", borderRadius: 20, padding: "4px 8px", display: "flex", alignItems: "center", gap: 3 },
  reactionCount: { fontSize: 12, fontFamily: "sans-serif", color: "#7c3aed" },
  commentsWrap: { marginTop: 12 },
  commentBox: { background: "#faf5ff", padding: "8px 12px", borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  commentText: { flex: 1, fontSize: 13, fontFamily: "sans-serif", color: "#3b0764", wordBreak: "break-word" },
  commentInput: { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e9d5ff", fontFamily: "sans-serif", fontSize: 13, boxSizing: "border-box", outline: "none", marginTop: 6 },
  commentBtn: { marginLeft: 4, padding: "4px 10px", borderRadius: 8, border: "none", background: "#e9d5ff", color: "#7c3aed", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  empty: { textAlign: "center", color: "#9d6b9d", fontSize: 14, fontFamily: "sans-serif", padding: "24px 0" },
  emptySmall: { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", padding: "10px 0" },
};