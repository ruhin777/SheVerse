import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/groups";
const API_PROFILE = "http://localhost:5000/api/profile"; // ADDED: for fetching profile pics
const emojis = ["❤️", "👍", "😂", "😮", "😢"];

// ══════════════════════════════════════════
//  MAIN PAGE — Search + Categories + Groups
// ══════════════════════════════════════════
export default function GroupPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [view, setView] = useState("home");       // "home" | "category" | "group"
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);

  // Create group modal
  const [showCreate, setShowCreate] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newName, setNewName] = useState("");
  const [catSuggestions, setCatSuggestions] = useState([]);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [createMsg, setCreateMsg] = useState("");

  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // ── Fetch categories ──
  const fetchCategories = async () => {
    const { data } = await axios.get(`${API}/categories/list`);
    setCategories(data);
  };

  const fetchGroupsByCategory = async (cat) => {
    const { data } = await axios.get(`${API}/category/${cat}`);
    setGroups(data);
  };

  useEffect(() => { fetchCategories(); }, []);

  // ── Live search ──
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const delay = setTimeout(async () => {
      const { data: grps } = await axios.get(`${API}?search=${searchQuery}`);
      const { data: cats } = await axios.get(`${API}/categories/list?search=${searchQuery}`);
      setSearchResults({ groups: grps, categories: cats });
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // ── Create: category autocomplete ──
  useEffect(() => {
    if (!newCat.trim()) { setCatSuggestions([]); return; }
    const delay = setTimeout(async () => {
      const { data } = await axios.get(`${API}/categories/list?search=${newCat}`);
      setCatSuggestions(data);
    }, 200);
    return () => clearTimeout(delay);
  }, [newCat]);

  // ── Create: group name autocomplete ──
  useEffect(() => {
    if (!newName.trim()) { setNameSuggestions([]); return; }
    const delay = setTimeout(async () => {
      const { data } = await axios.get(`${API}?search=${newName}`);
      setNameSuggestions(data.map(g => g.name));
    }, 200);
    return () => clearTimeout(delay);
  }, [newName]);

  const handleCreateGroup = async () => {
    if (!newCat.trim() || !newName.trim()) return;
    try {
      const { data } = await axios.post(API, {
        name: newName.trim(),
        category: newCat.trim(),
        creatorId: user._id,
        creatorName: user.name
      });
      setCreateMsg("Group created successfully! ✨");
      setTimeout(() => {
        setCreateMsg("");
        setShowCreate(false);
        setNewCat(""); setNewName("");
        setSelectedGroup(data);
        setView("group");
      }, 2000);
      fetchCategories();
    } catch {
      setCreateMsg("Failed to create group.");
    }
  };

  const handleCategoryClick = async (cat) => {
    setSelectedCategory(cat);
    setSearchQuery("");
    setSearchResults(null);
    await fetchGroupsByCategory(cat);
    setView("category");
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setView("group");
  };

  if (view === "group" && selectedGroup) {
    return (
      <GroupDetailPage
        group={selectedGroup}
        user={user}
        onBack={() => { setView(selectedCategory ? "category" : "home"); setSelectedGroup(null); }}
        onDeleted={() => {
          fetchCategories();
          setView(selectedCategory ? "category" : "home");
          setSelectedGroup(null);
          if (selectedCategory) fetchGroupsByCategory(selectedCategory);
        }}
      />
    );
  }

  const renderGroupCard = (g) => (
    <div key={g._id} style={S.groupCard} onClick={() => handleGroupClick(g)}>
      <div style={S.groupCardInner}>
        <div style={S.groupIcon}>{g.name[0].toUpperCase()}</div>
        <div>
          <div style={S.groupName}>{g.name}</div>
          <div style={S.groupCat}>{g.category}</div>
        </div>
      </div>
      <div style={S.arrowIcon}>›</div>
    </div>
  );

  const renderCategoryCard = (cat) => (
    <div key={cat} style={S.catCard} onClick={() => handleCategoryClick(cat)}>
      <div style={S.catIcon}>{cat[0].toUpperCase()}</div>
      <div style={S.catName}>{cat}</div>
      <div style={S.arrowIcon}>›</div>
    </div>
  );

  return (
    <div style={S.wrapper}>
      <div style={S.bg} /><div style={S.overlay} />
      {toast && <div style={S.toast}>{toast}</div>}

      <div style={S.content}>

        {/* ── Header ── */}
        <div style={S.header}>
          {view === "category" && (
            <button style={S.backBtn} onClick={() => { setView("home"); setSelectedCategory(null); setGroups([]); }}>
              ← Back
            </button>
          )}
          <h2 style={S.title}>{view === "category" ? selectedCategory : "Groups"}</h2>
        </div>

        {/* ── Search Bar + Create Button ── */}
        <div style={S.searchRow}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              style={S.searchInput}
              placeholder="Search groups or categories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button style={S.clearBtn} onClick={() => { setSearchQuery(""); setSearchResults(null); }}>✕</button>
            )}
          </div>
          <button style={S.plusBtn} title="Create Group" onClick={() => setShowCreate(true)}>＋</button>
        </div>

        {/* ── Search Results ── */}
        {searchResults && (
          <div style={S.section}>
            {searchResults.categories.length === 0 && searchResults.groups.length === 0 && (
              <div style={S.empty}>No results found for "{searchQuery}"</div>
            )}
            {searchResults.categories.length > 0 && (
              <>
                <div style={S.sectionLabel}>CATEGORIES</div>
                {searchResults.categories.map(renderCategoryCard)}
              </>
            )}
            {searchResults.groups.length > 0 && (
              <>
                <div style={S.sectionLabel}>GROUPS</div>
                {searchResults.groups.map(renderGroupCard)}
              </>
            )}
          </div>
        )}

        {/* ── Home: Category List ── */}
        {!searchResults && view === "home" && (
          <div style={S.section}>
            <div style={S.sectionLabel}>CATEGORIES</div>
            {categories.length === 0 && (
              <div style={S.empty}>No groups yet. Be the first to create one!</div>
            )}
            {categories.map(renderCategoryCard)}
          </div>
        )}

        {/* ── Category: Groups List ── */}
        {!searchResults && view === "category" && (
          <div style={S.section}>
            <div style={S.sectionLabel}>GROUPS IN {selectedCategory?.toUpperCase()}</div>
            {groups.length === 0 && <div style={S.empty}>No groups in this category yet.</div>}
            {groups.map(renderGroupCard)}
          </div>
        )}
      </div>

      {/* ══ Create Group Modal ══ */}
      {showCreate && (
        <div style={S.modalOverlay} onClick={() => setShowCreate(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Create Group</h3>
            {createMsg ? (
              <div style={S.successMsg}>{createMsg}</div>
            ) : (
              <>
                <div style={S.inputWrap}>
                  <label style={S.label}>Category</label>
                  <input
                    style={S.input}
                    placeholder="Type or select category..."
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                  />
                  {catSuggestions.length > 0 && newCat && (
                    <div style={S.suggestions}>
                      {catSuggestions.map(c => (
                        <div key={c} style={S.suggestion}
                          onMouseDown={() => { setNewCat(c); setCatSuggestions([]); }}>
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={S.inputWrap}>
                  <label style={S.label}>Group Name</label>
                  <input
                    style={S.input}
                    placeholder="Type or select group name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                  {nameSuggestions.length > 0 && newName && (
                    <div style={S.suggestions}>
                      {nameSuggestions.map(n => (
                        <div key={n} style={S.suggestion}
                          onMouseDown={() => { setNewName(n); setNameSuggestions([]); }}>
                          {n}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={S.modalBtns}>
                  <button style={S.cancelBtn} onClick={() => { setShowCreate(false); setNewCat(""); setNewName(""); }}>
                    Cancel
                  </button>
                  <button style={S.saveBtn} onClick={handleCreateGroup}>Save</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
//  GROUP DETAIL PAGE
// ══════════════════════════════════════════
function GroupDetailPage({ group: initialGroup, user, onBack, onDeleted }) {
  // FIX 1: group state is kept in sync — refreshGroup() fetches latest from DB
  const [group, setGroup] = useState(initialGroup);
  const [isMember, setIsMember] = useState(false);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});

  // REMOVED: postIsAnonymous state — anonymous posting removed
  const [postContent, setPostContent] = useState("");

  const [newComment, setNewComment] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostText, setEditPostText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  const [toast, setToast] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [show3Dot, setShow3Dot] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const dotRef = useRef(null);

  // ADDED: profile pics cache — maps userId -> photo url (or null)
  const [userProfiles, setUserProfiles] = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const getYouTubeEmbed = (url) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

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

  // FIX 1: refreshGroup fetches fresh group data and updates local state
  const refreshGroup = async () => {
    try {
      const { data } = await axios.get(`${API}/${group._id}`);
      setGroup(data);
      return data;
    } catch (err) {
      console.error("Failed to refresh group", err);
    }
  };

  const fetchMembership = async () => {
    const { data } = await axios.get(`${API}/${group._id}/ismember/${user._id}`);
    setIsMember(data.isMember);
  };

  const fetchMembers = async () => {
    const { data } = await axios.get(`${API}/${group._id}/members?search=${memberSearch}`);
    setMembers(data);
  };

  const fetchPosts = async () => {
    const { data } = await axios.get(`${API}/${group._id}/posts`);
    setPosts(data);
    data.forEach(p => fetchReactions(p._id));
    data.forEach(p => fetchComments(p._id));
    // ADDED: fetch profile pics for all post authors
    data.forEach(p => fetchUserProfile(p.authorId?.toString()));
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

  useEffect(() => {
    fetchMembership();
    fetchPosts();
    // ADDED: fetch current user's own profile pic
    fetchUserProfile(user._id);
  }, [group._id]);

  useEffect(() => { fetchMembers(); }, [memberSearch, group._id]);

  useEffect(() => {
    const handler = (e) => { if (dotRef.current && !dotRef.current.contains(e.target)) setShow3Dot(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleJoin = async () => {
    await axios.post(`${API}/${group._id}/join`, { userId: user._id, username: user.name });
    setIsMember(true);
    showToast(`Welcome to ${group.name}! 🎉`);
    fetchMembers();
  };

  // FIX 1: handleLeave now uses the updated group returned by backend to sync admin panel
  const handleLeave = async () => {
    try {
      const { data } = await axios.delete(`${API}/${group._id}/leave/${user._id}`);
      setIsMember(false);
      setShow3Dot(false);
      showToast("You have left the group.");
      if (data.group) {
        setGroup(data.group);
      } else {
        await refreshGroup();
      }
      fetchMembers();
    } catch (err) {
      showToast("Failed to leave group.");
    }
  };

  // FIX 2: Delete group — only current admin/creator can do this
  const handleDeleteGroup = async () => {
    try {
      await axios.delete(`${API}/${group._id}/delete/${user._id}`);
      showToast("Group deleted successfully.");
      setShowDeleteConfirm(false);
      setShow3Dot(false);
      setTimeout(() => {
        if (onDeleted) onDeleted();
        else onBack();
      }, 1000);
    } catch (err) {
      showToast(err?.response?.data?.error || "Failed to delete group.");
      setShowDeleteConfirm(false);
    }
  };

  
  const handlePost = async () => {
    if (!postContent.trim()) return;

    try {
      
      await axios.post(`${API}/${group._id}/posts`, {
        authorId: user._id,
        authorName: user.name,
        content: postContent,
      });

      setPostContent("");
      fetchPosts();
    } catch (err) {
      showToast("Failed to post. Please try again.");
    }
  };

  const handleReaction = async (postId, emoji) => {
    await axios.post(`${API}/reaction`, { groupPostId: postId, userId: user._id, emoji });
    fetchReactions(postId);
  };

  const handleRemoveReaction = async (postId) => {
    await axios.delete(`${API}/reaction`, { data: { groupPostId: postId, userId: user._id } });
    fetchReactions(postId);
  };

  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    await axios.post(`${API}/comment`, {
      groupPostId: postId, userId: user._id, username: user.name, text: newComment[postId]
    });
    setNewComment(prev => ({ ...prev, [postId]: "" }));
    fetchComments(postId);
  };

  const handleSavePost = async (postId) => {
    await axios.put(`${API}/posts/${postId}`, { content: editPostText, userId: user._id });
    setEditingPostId(null);
    fetchPosts();
  };

  const handleDeletePost = async (postId) => {
    await axios.delete(`${API}/posts/${postId}/${user._id}`);
    fetchPosts();
  };

  const handleSaveComment = async (comment) => {
    await axios.put(`${API}/comment/${comment._id}`, { text: editCommentText, userId: user._id });
    setEditingCommentId(null);
    fetchComments(comment.groupPostId);
  };

  const handleDeleteComment = async (comment) => {
    await axios.delete(`${API}/comment/${comment._id}/${user._id}`);
    fetchComments(comment.groupPostId);
  };

  // FIX 1: isAdmin checks against the live `group` state
  const isAdmin = group.creatorId?.toString() === user._id;

  return (
    <div style={S.wrapper}>
      <div style={S.bg} /><div style={S.overlay} />
      {toast && <div style={S.toast}>{toast}</div>}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm && (
        <div style={S.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Delete Group?</h3>
            <p style={{ textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14, marginBottom: 24 }}>
              This will permanently delete <strong>{group.name}</strong> along with all its posts, comments, reactions, and members. This cannot be undone.
            </p>
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button
                style={{ ...S.saveBtn, background: "linear-gradient(135deg, #e11d48, #be123c)" }}
                onClick={handleDeleteGroup}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.content}>

        {/* ── Group Header ── */}
        <div style={S.groupHeader}>
          <button style={S.backBtn} onClick={onBack}>← Back</button>
          <div style={S.groupTitleWrap}>
            <h1 style={S.groupTitle}>{group.name}</h1>
            <div style={S.groupSubtitle}>{group.category}</div>
          </div>
          {isMember && (
            <div style={{ position: "relative" }} ref={dotRef}>
              <button style={S.dotBtn} onClick={() => setShow3Dot(p => !p)}>⋯</button>
              {show3Dot && (
                <div style={S.dotMenu}>
                  <div style={S.dotMenuItem} onClick={handleLeave}>🚪 Leave Group</div>
                  {/* FIX 2: Delete option only shown to current admin */}
                  {isAdmin && (
                    <div
                      style={{ ...S.dotMenuItem, color: "#e11d48", borderTop: "1px solid #f3e8ff" }}
                      onClick={() => { setShow3Dot(false); setShowDeleteConfirm(true); }}
                    >
                      🗑️ Delete Group
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Info Buttons ── */}
        <div style={S.infoRow}>
          <button style={S.infoBtn} onClick={() => setShowMembers(p => !p)}>
            👥 Members ({members.length})
          </button>
        </div>

        {/* Members Panel */}
        {showMembers && (
          <div style={S.infoPanel}>
            <input
              style={S.memberSearch}
              placeholder="Search members..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
            />
            {members.length === 0 && <div style={S.empty}>No members found.</div>}
            {members.map(m => (
              <div key={m._id} style={S.memberItem}>
                <div style={S.memberAvatar}>{(m.username || "U")[0].toUpperCase()}</div>
                <span style={S.memberName}>{m.username || "Unknown Member"}</span>
                {m.userId?.toString() === group.creatorId?.toString() && (
                  <span style={{ ...S.adminBadge, background: "#7c3aed", color: "#fff" }}>
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Join Button (non-members) ── */}
        {!isMember && (
          <div style={S.joinWrap}>
            <div style={S.joinCard}>
              <p style={S.joinText}>Join this group to post, comment and react.</p>
              <button style={S.joinBtn} onClick={handleJoin}>Join Group</button>
            </div>
          </div>
        )}

        {/* ── Post Composer (members only) ── */}
        {isMember && (
          <div style={S.card}>
            {/* Author row */}
            {/* CHANGED: always shows user.name, no anonymous toggle */}
            <div style={S.composerAuthor}>
              {renderAvatar(user._id, user.name)}
              <span style={S.composerName}>{user.name}</span>
            </div>

            <textarea
              placeholder={`Write something in ${group.name}...`}
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              style={S.textarea}
            />

            <div style={S.postActions}>
              <button style={S.btn} onClick={handlePost}>
                Post
              </button>
            </div>
          </div>
        )}

        {/* ── Posts ── */}
        {posts.map(p => {
          const postReactions = reactions[p._id] || [];
          const postComments = comments[p._id] || [];
          const userReaction = postReactions.find(r => r.userId?.toString() === user._id)?.emoji;
          const countReactions = emojis.map(e => postReactions.filter(r => r.emoji === e).length);

          // CHANGED: no anonymous logic — always show real author name
          const displayName = p.authorName || p.username || "Unknown User";

          return (
            <div key={p._id} style={S.card}>
              <div style={S.postHeader}>
                <div style={S.postAuthorRow}>
                  {/* CHANGED: show profile pic if available, else avatar fallback */}
                  {renderAvatar(p.authorId?.toString(), displayName)}
                  <div>
                    <strong style={S.postAuthor}>{displayName}</strong>
                    <div style={S.timestamp}>{new Date(p.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                {p.authorId?.toString() === user._id && (
                  <div style={S.actionRow}>
                    <button style={S.commentBtn} onClick={() => { setEditingPostId(p._id); setEditPostText(p.content); }}>Edit</button>
                    <button style={S.commentBtn} onClick={() => handleDeletePost(p._id)}>Delete</button>
                  </div>
                )}
              </div>

              {editingPostId === p._id ? (
                <>
                  <textarea value={editPostText} onChange={e => setEditPostText(e.target.value)} style={S.textarea} />
                  <button style={S.commentBtn} onClick={() => handleSavePost(p._id)}>Save</button>
                </>
              ) : (
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
                          style={{ borderRadius: 10, marginTop: 8 }}
                        />
                      );
                    }
                    if (part.match(/https?:\/\/[^\s]+/)) {
                      return (
                        <a key={i} href={part} target="_blank" rel="noreferrer" style={S.postLink}>
                          {part}
                        </a>
                      );
                    }
                    return part;
                  })}
                </p>
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
                    onClick={() => isMember && handleReaction(p._id, e)}
                  >
                    {e} {countReactions[i] > 0 && <span style={S.reactionCount}>{countReactions[i]}</span>}
                  </button>
                ))}
                {userReaction && isMember && (
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
                          <button style={S.commentBtn} onClick={() => handleSaveComment(c)}>Save</button>
                        </>
                      ) : (
                        <><strong>{c.username}</strong>: {c.text}</>
                      )}
                    </div>
                    {c.userId?.toString() === user._id && (
                      <div>
                        <button style={S.commentBtn} onClick={() => { setEditingCommentId(c._id); setEditCommentText(c.text); }}>Edit</button>
                        <button style={S.commentBtn} onClick={() => handleDeleteComment(c)}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}

                {isMember && (
                  <>
                    <input
                      placeholder="Write a comment..."
                      value={newComment[p._id] || ""}
                      onChange={e => setNewComment(prev => ({ ...prev, [p._id]: e.target.value }))}
                      style={S.commentInput}
                    />
                    <button style={S.commentBtn} onClick={() => handleAddComment(p._id)}>Comment</button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {posts.length === 0 && isMember && (
          <div style={S.empty}>No posts yet. Be the first to share something! 💬</div>
        )}
        {posts.length === 0 && !isMember && (
          <div style={S.empty}>Join the group to see and create posts.</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  STYLES — 100% identical to your original
// ══════════════════════════════════════════
const S = {
  wrapper: { position: "relative", minHeight: "100vh", fontFamily: "Georgia, serif" },
  bg: {
    position: "fixed", inset: 0,
    backgroundImage: "url('https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg')",
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "blur(0.5px)", transform: "scale(1.1)", zIndex: -2
  },
  overlay: { position: "fixed", inset: 0, background: "rgba(255,245,250,0.72)", zIndex: -1 },
  content: { maxWidth: 680, margin: "0 auto", padding: "24px 16px", position: "relative", zIndex: 1 },
  toast: {
    position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
    background: "#7c3aed", color: "#fff", padding: "12px 28px",
    borderRadius: 30, fontSize: 14, fontFamily: "sans-serif",
    boxShadow: "0 4px 20px rgba(124,58,237,0.3)", zIndex: 999
  },

  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 400, color: "#3b0764", fontFamily: "Georgia, serif", margin: 0 },
  backBtn: {
    background: "transparent", border: "none", color: "#9d4edd",
    cursor: "pointer", fontSize: 14, fontFamily: "sans-serif", padding: "6px 0"
  },

  searchRow: { display: "flex", gap: 10, alignItems: "center", marginBottom: 20 },
  searchWrap: {
    flex: 1, display: "flex", alignItems: "center",
    background: "#fff", borderRadius: 30, border: "1px solid #e9d5ff",
    boxShadow: "0 2px 12px rgba(157,107,157,0.1)", padding: "0 14px", gap: 8
  },
  searchIcon: { fontSize: 16, opacity: 0.6 },
  searchInput: {
    flex: 1, border: "none", outline: "none", padding: "12px 0",
    fontSize: 14, fontFamily: "sans-serif", background: "transparent", color: "#3b0764"
  },
  clearBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#9d6b9d", fontSize: 14, padding: 0 },
  plusBtn: {
    width: 44, height: 44, borderRadius: "50%",
    background: "linear-gradient(135deg, #c084c4, #9d4edd)",
    color: "#fff", border: "none", fontSize: 22, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(157,107,157,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
  },

  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 10, paddingLeft: 4 },

  catCard: {
    display: "flex", alignItems: "center", gap: 14,
    background: "#fff", borderRadius: 14, padding: "14px 18px", marginBottom: 10,
    cursor: "pointer", boxShadow: "0 3px 12px rgba(157,107,157,0.1)", border: "1px solid #f3e8ff"
  },
  catIcon: {
    width: 42, height: 42, borderRadius: "50%",
    background: "linear-gradient(135deg, #e879a8, #c084c4)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: "bold", flexShrink: 0
  },
  catName: { flex: 1, fontSize: 15, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 500 },

  groupCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#fff", borderRadius: 14, padding: "14px 18px", marginBottom: 10,
    cursor: "pointer", boxShadow: "0 3px 12px rgba(157,107,157,0.1)", border: "1px solid #f3e8ff"
  },
  groupCardInner: { display: "flex", alignItems: "center", gap: 14 },
  groupIcon: {
    width: 42, height: 42, borderRadius: 12,
    background: "linear-gradient(135deg, #c084c4, #7c3aed)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: "bold", flexShrink: 0
  },
  groupName: { fontSize: 15, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 500 },
  groupCat: { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", marginTop: 2 },
  arrowIcon: { color: "#c084c4", fontSize: 22, fontWeight: "bold" },
  empty: { textAlign: "center", color: "#9d6b9d", fontSize: 14, fontFamily: "sans-serif", padding: "32px 0" },

  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(59,7,100,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500
  },
  modal: {
    background: "#fff", borderRadius: 20, padding: 32,
    width: "90%", maxWidth: 420, boxShadow: "0 20px 60px rgba(124,58,237,0.25)"
  },
  modalTitle: { fontSize: 20, color: "#3b0764", fontFamily: "Georgia, serif", marginBottom: 24, textAlign: "center" },
  inputWrap: { marginBottom: 20, position: "relative" },
  label: { display: "block", fontSize: 11, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 6 },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid #e9d5ff", fontFamily: "sans-serif", fontSize: 14,
    color: "#3b0764", outline: "none", boxSizing: "border-box"
  },
  suggestions: {
    position: "absolute", top: "100%", left: 0, right: 0,
    background: "#fff", border: "1px solid #e9d5ff",
    borderRadius: "0 0 10px 10px", zIndex: 10,
    boxShadow: "0 8px 20px rgba(157,107,157,0.15)", maxHeight: 160, overflowY: "auto"
  },
  suggestion: {
    padding: "10px 14px", fontSize: 14, cursor: "pointer",
    fontFamily: "sans-serif", color: "#3b0764", borderBottom: "1px solid #f3e8ff"
  },
  modalBtns: { display: "flex", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #e9d5ff",
    background: "transparent", color: "#9d6b9d", cursor: "pointer", fontSize: 14, fontFamily: "sans-serif"
  },
  saveBtn: {
    flex: 1, padding: "12px", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg, #c084c4, #9d4edd)",
    color: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "sans-serif",
    boxShadow: "0 4px 14px rgba(157,107,157,0.3)"
  },
  successMsg: { textAlign: "center", color: "#7c3aed", fontSize: 16, fontFamily: "Georgia, serif", padding: "20px 0" },

  groupHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, position: "relative" },
  groupTitleWrap: { flex: 1 },
  groupTitle: {
    fontSize: 28, fontWeight: "bold", margin: 0,
    background: "linear-gradient(135deg, #7c3aed, #e879a8)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
  },
  groupSubtitle: { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", marginTop: 2, letterSpacing: 1 },
  dotBtn: {
    background: "transparent", border: "none", fontSize: 22,
    color: "#9d4edd", cursor: "pointer", padding: "4px 8px", borderRadius: 8
  },
  dotMenu: {
    position: "absolute", right: 0, top: "110%",
    background: "#fff", border: "1px solid #f3e8ff",
    borderRadius: 12, boxShadow: "0 8px 24px rgba(157,107,157,0.2)",
    minWidth: 160, zIndex: 100
  },
  dotMenuItem: { padding: "12px 18px", fontSize: 14, cursor: "pointer", fontFamily: "sans-serif", color: "#e11d48", borderRadius: 12 },

  infoRow: { display: "flex", gap: 10, marginBottom: 16 },
  infoBtn: {
    padding: "8px 18px", borderRadius: 20, border: "1px solid #e9d5ff",
    background: "#fff", color: "#7c3aed", cursor: "pointer",
    fontSize: 13, fontFamily: "sans-serif", boxShadow: "0 2px 8px rgba(157,107,157,0.1)"
  },
  infoPanel: {
    background: "#fff", borderRadius: 14, padding: 16, marginBottom: 16,
    boxShadow: "0 3px 12px rgba(157,107,157,0.1)", border: "1px solid #f3e8ff"
  },
  memberSearch: {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid #e9d5ff", marginBottom: 12,
    fontFamily: "sans-serif", fontSize: 14, boxSizing: "border-box", outline: "none"
  },
  memberItem: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f9f0ff" },
  memberAvatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "linear-gradient(135deg, #c084c4, #9d4edd)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: "bold", flexShrink: 0
  },
  memberName: { flex: 1, fontSize: 14, fontFamily: "sans-serif", color: "#3b0764" },
  adminBadge: {
    fontSize: 10, background: "#f3e8ff", color: "#7c3aed",
    padding: "3px 8px", borderRadius: 10, fontFamily: "sans-serif", letterSpacing: 1
  },

  joinWrap: { marginBottom: 20 },
  joinCard: {
    background: "#fff", borderRadius: 14, padding: "24px",
    textAlign: "center", border: "1px solid #f3e8ff",
    boxShadow: "0 3px 12px rgba(157,107,157,0.1)"
  },
  joinText: { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14, marginBottom: 16 },
  joinBtn: {
    padding: "12px 36px", borderRadius: 24, border: "none",
    background: "linear-gradient(135deg, #c084c4, #9d4edd)",
    color: "#fff", fontSize: 15, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(157,107,157,0.35)", fontFamily: "sans-serif"
  },

  card: {
    background: "#fff", padding: 20, marginBottom: 16,
    borderRadius: 14, boxShadow: "0 4px 16px rgba(157,107,157,0.12)", border: "1px solid #f3e8ff"
  },
  composerAuthor: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  composerName: { fontSize: 14, fontFamily: "sans-serif", color: "#3b0764", fontWeight: 500 },
  postActions: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  checkbox: { display: "flex", gap: 6, alignItems: "center", fontSize: 13, fontFamily: "sans-serif", color: "#3b0764", cursor: "pointer" },
  fileLabel: {
    fontSize: 13, fontFamily: "sans-serif", color: "#9d4edd",
    cursor: "pointer", display: "flex", alignItems: "center", gap: 4
  },
  btn: {
    marginLeft: "auto", padding: "9px 22px", borderRadius: 20, border: "none",
    background: "linear-gradient(135deg, #c084c4, #9d4edd)",
    color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "sans-serif"
  },

  postHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  postAuthorRow: { display: "flex", alignItems: "center", gap: 10 },
  postAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #e879a8, #c084c4)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: "bold", flexShrink: 0
  },
  postAuthor: { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif" },
  timestamp: { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif" },
  postText: { color: "#3b0764", lineHeight: 1.6, fontFamily: "sans-serif", marginBottom: 8, wordBreak: "break-word" },
  postImage: { width: "100%", borderRadius: 12, marginBottom: 8 },
  postLink: {
    display: "block", color: "#7c3aed", fontSize: 13, fontFamily: "sans-serif",
    marginBottom: 8, wordBreak: "break-all", textDecoration: "none"
  },
  actionRow: { display: "flex", gap: 6 },

  textarea: {
    width: "100%", padding: 12, borderRadius: 10,
    border: "1px solid #e9d5ff", resize: "vertical",
    boxSizing: "border-box", marginBottom: 10,
    fontFamily: "sans-serif", fontSize: 14, color: "#3b0764", outline: "none"
  },
  reactions: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" },
  emojiBtn: { border: "none", fontSize: 17, cursor: "pointer", borderRadius: 20, padding: "4px 8px", display: "flex", alignItems: "center", gap: 3 },
  reactionCount: { fontSize: 12, fontFamily: "sans-serif", color: "#7c3aed" },

  comments: { marginTop: 14 },
  commentBox: {
    background: "#faf5ff", padding: "8px 12px", borderRadius: 10, marginBottom: 8,
    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8
  },
  commentText: { flex: 1, fontSize: 13, fontFamily: "sans-serif", color: "#3b0764", wordBreak: "break-word" },
  commentInput: {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: "1px solid #e9d5ff", fontFamily: "sans-serif",
    fontSize: 13, boxSizing: "border-box", outline: "none"
  },
  commentBtn: {
    marginLeft: 4, padding: "4px 10px", borderRadius: 8,
    border: "none", background: "#e9d5ff", color: "#7c3aed",
    cursor: "pointer", fontSize: 12, fontFamily: "sans-serif"
  }
};