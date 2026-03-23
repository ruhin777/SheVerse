import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/articles";
const CATEGORIES = ["All", "Nutrition", "Hygiene", "Legal Rights", "Safety", "Education", "Mental Health"];

const user = JSON.parse(localStorage.getItem("user") || "{}");

export default function ArticlesPage() {
  const [articles, setArticles]       = useState([]);
  const [bookmarks, setBookmarks]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [category, setCategory]       = useState("All");
  const [search, setSearch]           = useState("");
  const [activeTab, setActiveTab]     = useState("browse"); // browse | write | bookmarks
  const [selected, setSelected]       = useState(null); // article detail view
  const [userRating, setUserRating]   = useState(0);
  const [ratingMsg, setRatingMsg]     = useState("");

  // Write form
  const [form, setForm] = useState({ title:"", category:"Nutrition", content:"", image:"" });
  const [submitting, setSubmitting]   = useState(false);
  const [submitMsg, setSubmitMsg]     = useState("");

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== "All") params.category = category;
      if (search) params.search = search;
      const { data } = await axios.get(API, { params });
      if (data.success) setArticles(data.articles);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchBookmarks = async () => {
    try {
      const { data } = await axios.get(`${API}/bookmarks/${user._id}`);
      if (data.success) setBookmarks(data.articles);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchArticles(); }, [category, search]);
  useEffect(() => { if (user._id) fetchBookmarks(); }, []);

  const handleLike = async (articleId) => {
    try {
      const { data } = await axios.post(`${API}/${articleId}/like`, { userId: user._id });
      if (data.success) {
        setArticles(prev => prev.map(a => a._id === articleId
          ? { ...a, likes: data.liked ? [...(a.likes||[]), user._id] : (a.likes||[]).filter(id => id !== user._id) }
          : a));
        if (selected?._id === articleId) {
          setSelected(prev => ({ ...prev, likes: data.liked ? [...(prev.likes||[]), user._id] : (prev.likes||[]).filter(id => id !== user._id) }));
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleBookmark = async (articleId) => {
    try {
      const { data } = await axios.post(`${API}/${articleId}/bookmark`, { userId: user._id });
      if (data.success) {
        fetchBookmarks();
        if (selected?._id === articleId) {
          setSelected(prev => ({ ...prev, bookmarked: data.bookmarked }));
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleRate = async (articleId, rating) => {
    try {
      const { data } = await axios.post(`${API}/${articleId}/rate`, { userId: user._id, rating });
      if (data.success) {
        setRatingMsg(`✅ Rated ${rating}/5!`);
        setUserRating(rating);
        setTimeout(() => setRatingMsg(""), 2000);
      }
    } catch (err) { console.error(err); }
  };

  const handleSubmitArticle = async () => {
    if (!form.title || !form.content || !form.category) {
      setSubmitMsg("❌ Please fill title, category and content.");
      return;
    }
    setSubmitting(true); setSubmitMsg("");
    try {
      const { data } = await axios.post(API, {
        ...form,
        authorId: user._id,
        authorName: user.name || "Anonymous",
      });
      if (data.success) {
        setSubmitMsg("✅ Article published successfully!");
        setForm({ title:"", category:"Nutrition", content:"", image:"" });
        fetchArticles();
        setTimeout(() => { setActiveTab("browse"); setSubmitMsg(""); }, 1500);
      }
    } catch (err) { setSubmitMsg("❌ Failed to publish. Try again."); }
    setSubmitting(false);
  };

  const isLiked       = (a) => (a.likes || []).includes(user._id);
  const isBookmarked  = (a) => bookmarks.some(b => b._id === a._id);
  const avgRating     = (a) => {
    if (!a.ratings || a.ratings.length === 0) return 0;
    return (a.ratings.reduce((s, r) => s + r.rating, 0) / a.ratings.length).toFixed(1);
  };

  const Stars = ({ articleId, current }) => (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => handleRate(articleId, n)}
          style={{ fontSize:"1.6rem", cursor:"pointer", color: n <= (userRating || current) ? "#f4a261" : "#e0d0f0" }}>
          ★
        </span>
      ))}
    </div>
  );

  // ── ARTICLE DETAIL VIEW ──
  if (selected) {
    return (
      <div style={S.wrapper}>
        <div style={S.page}>
          <button onClick={() => { setSelected(null); setUserRating(0); setRatingMsg(""); }}
            style={S.backBtn}>← Back to Articles</button>

          <div style={S.detailCard}>
            {selected.image && (
              <img src={selected.image} alt={selected.title}
                style={{ width:"100%", height:280, objectFit:"cover", borderRadius:"14px 14px 0 0" }}/>
            )}
            <div style={{ padding:32 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <span style={S.catBadge}>{selected.category}</span>
                <div style={{ display:"flex", gap:12 }}>
                  <button onClick={() => handleLike(selected._id)}
                    style={{ ...S.actionBtn, color: isLiked(selected) ? "#e8637a" : "#9b72cf", background: isLiked(selected) ? "#fde8ec" : "#f0e8fb" }}>
                    {isLiked(selected) ? "❤️" : "🤍"} {(selected.likes||[]).length}
                  </button>
                  <button onClick={() => handleBookmark(selected._id)}
                    style={{ ...S.actionBtn, color: isBookmarked(selected) ? "#f4a261" : "#9b72cf", background: isBookmarked(selected) ? "#fef3eb" : "#f0e8fb" }}>
                    {isBookmarked(selected) ? "🔖" : "📌"} {isBookmarked(selected) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>

              <h1 style={S.detailTitle}>{selected.title}</h1>
              <div style={S.detailMeta}>
                By <strong>{selected.authorName || "Anonymous"}</strong> · {new Date(selected.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
              </div>

              <div style={S.detailContent}>{selected.content}</div>

              {/* Rating */}
              <div style={S.ratingBox}>
                <div style={{ fontWeight:600, color:"#6b3fa0", marginBottom:8, fontSize:"0.95rem" }}>Rate this article</div>
                <Stars articleId={selected._id} current={avgRating(selected)}/>
                {ratingMsg && <div style={{ marginTop:8, fontSize:"0.85rem", color:"#4caf78" }}>{ratingMsg}</div>}
                <div style={{ marginTop:8, fontSize:"0.85rem", color:"#b89ec4" }}>
                  Average: ⭐ {avgRating(selected)} ({(selected.ratings||[]).length} ratings)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN VIEW ──
  return (
    <div style={S.wrapper}>
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.headerSub}>HEALTH & WELLNESS</p>
          <h1 style={S.headerTitle}>Health Articles</h1>
          <div style={S.headerDivider}/>
          <p style={S.headerDesc}>Read, share and discover women's health knowledge</p>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {[
            { key:"browse",    label:"📖 Browse" },
            { key:"bookmarks", label:"🔖 Saved" },
            { key:"write",     label:"✍️ Write" },
          ].map(t => (
            <button key={t.key}
              style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── BROWSE TAB ── */}
        {activeTab === "browse" && (
          <div>
            {/* Search */}
            <div style={S.searchRow}>
              <input
                style={S.searchInput}
                placeholder="🔍 Search articles..."
                value={search}
                onChange={e => setSearch(e.target.value)}/>
            </div>

            {/* Category filters */}
            <div style={S.catRow}>
              {CATEGORIES.map(c => (
                <button key={c}
                  style={{ ...S.catBtn, ...(category === c ? S.catBtnActive : {}) }}
                  onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>

            {/* Articles grid */}
            {loading ? (
              <div style={S.empty}>Loading articles...</div>
            ) : articles.length === 0 ? (
              <div style={S.emptyBox}>
                <div style={{ fontSize:"3rem", marginBottom:12 }}>📭</div>
                <p style={S.empty}>No articles found. Be the first to write one!</p>
                <button style={S.writeBtn} onClick={() => setActiveTab("write")}>✍️ Write an Article</button>
              </div>
            ) : (
              <div style={S.grid}>
                {articles.map(a => (
                  <div key={a._id} style={S.card}>
                    {a.image && (
                      <img src={a.image} alt={a.title}
                        style={{ width:"100%", height:160, objectFit:"cover", borderRadius:"14px 14px 0 0" }}/>
                    )}
                    <div style={S.cardBody}>
                      <span style={S.catBadge}>{a.category}</span>
                      <h3 style={S.cardTitle}>{a.title}</h3>
                      <p style={S.cardExcerpt}>{a.content?.substring(0, 120)}...</p>
                      <div style={S.cardMeta}>
                        <span>By {a.authorName || "Anonymous"}</span>
                        <span>⭐ {avgRating(a)}</span>
                      </div>
                      <div style={S.cardActions}>
                        <button onClick={() => handleLike(a._id)}
                          style={{ ...S.actionBtn, color: isLiked(a) ? "#e8637a" : "#9b72cf", background: isLiked(a) ? "#fde8ec" : "#f0e8fb" }}>
                          {isLiked(a) ? "❤️" : "🤍"} {(a.likes||[]).length}
                        </button>
                        <button onClick={() => handleBookmark(a._id)}
                          style={{ ...S.actionBtn, color: isBookmarked(a) ? "#f4a261" : "#9b72cf", background: isBookmarked(a) ? "#fef3eb" : "#f0e8fb" }}>
                          {isBookmarked(a) ? "🔖" : "📌"}
                        </button>
                        <button onClick={() => { setSelected(a); setUserRating(0); }}
                          style={S.readBtn}>
                          Read →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKMARKS TAB ── */}
        {activeTab === "bookmarks" && (
          <div>
            {bookmarks.length === 0 ? (
              <div style={S.emptyBox}>
                <div style={{ fontSize:"5rem", marginBottom:12 }}>🔖</div>
                <p style={S.empty}>No saved articles yet. Bookmark articles to read later!</p>
              </div>
            ) : (
              <div style={S.grid}>
                {bookmarks.map(a => (
                  <div key={a._id} style={S.card}>
                    {a.image && (
                      <img src={a.image} alt={a.title}
                        style={{ width:"100%", height:160, objectFit:"cover", borderRadius:"14px 14px 0 0" }}/>
                    )}
                    <div style={S.cardBody}>
                      <span style={S.catBadge}>{a.category}</span>
                      <h3 style={S.cardTitle}>{a.title}</h3>
                      <p style={S.cardExcerpt}>{a.content?.substring(0, 120)}...</p>
                      <div style={S.cardActions}>
                        <button onClick={() => handleBookmark(a._id)}
                          style={{ ...S.actionBtn, color:"#f4a261", background:"#fef3eb" }}>
                          🔖 Remove
                        </button>
                        <button onClick={() => { setSelected(a); setUserRating(0); }}
                          style={S.readBtn}>
                          Read →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WRITE TAB ── */}
        {activeTab === "write" && (
          <div style={S.formWrap}>
            <div style={S.formCard}>
              <h2 style={S.formTitle}>✍️ Write an Article</h2>
              <p style={S.formSub}>Share your knowledge with the SheVerse community</p>

              <div style={S.formGroup}>
                <label style={S.label}>ARTICLE TITLE</label>
                <input style={S.input} placeholder="e.g. Understanding Your Menstrual Cycle"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>CATEGORY</label>
                <select style={S.input} value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.filter(c => c !== "All").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>IMAGE URL (optional)</label>
                <input style={S.input} placeholder="https://example.com/image.jpg"
                  value={form.image} onChange={e => setForm({ ...form, image: e.target.value })}/>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>CONTENT</label>
                <textarea style={{ ...S.input, minHeight:240, resize:"vertical", lineHeight:1.7 }}
                  placeholder="Write your article content here..."
                  value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}/>
              </div>

              {submitMsg && (
                <div style={{ padding:"12px 16px", borderRadius:10, marginBottom:16, fontSize:"0.9rem",
                  background: submitMsg.startsWith("✅") ? "#edfbf3" : "#fff0f4",
                  color: submitMsg.startsWith("✅") ? "#1a6b42" : "#9b2335",
                  border: `1px solid ${submitMsg.startsWith("✅") ? "rgba(76,175,120,0.2)" : "rgba(232,99,122,0.2)"}` }}>
                  {submitMsg}
                </div>
              )}

              <button style={{ ...S.writeBtn, width:"100%", justifyContent:"center", opacity: submitting ? 0.6 : 1 }}
                onClick={handleSubmitArticle} disabled={submitting}>
                {submitting ? "Publishing..." : "🚀 Publish Article"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const S = {
  wrapper:      { position:"relative", minHeight:"100vh", background:"#faf5ff", fontFamily:"'Plus Jakarta Sans', sans-serif" },
  page:         { maxWidth:1200, margin:"auto", padding:"40px 40px 60px" },

  header:       { textAlign:"center", marginBottom:36 },
  headerSub:    { fontSize:17, letterSpacing:4, color:"#c084c4", fontFamily:"sans-serif", marginBottom:8 },
  headerTitle:  { fontFamily:"Cormorant Garamond, serif", fontSize:40, fontWeight:600, color:"#4a2060", margin:"0 0 12px", letterSpacing:1 },
  headerDivider:{ width:60, height:2, background:"linear-gradient(90deg,#c084c4,#e879a8)", margin:"0 auto 14px" },
  headerDesc:   { fontSize:14, color:"#9d6b9d", fontFamily:"sans-serif" },

  tabs:         { display:"flex", gap:0, justifyContent:"center", marginBottom:32, border:"1px solid #e2c4e2", borderRadius:30, overflow:"hidden", maxWidth:380, margin:"0 auto 32px" },
  tab:          { flex:1, padding:"12px 20px", border:"none", background:"transparent", cursor:"pointer", fontSize:13, fontFamily:"sans-serif", color:"#9d6b9d", letterSpacing:0.5, transition:"all 0.2s" },
  tabActive:    { background:"linear-gradient(135deg,#9d4edd,#c77dff)", color:"#fff" },

  searchRow:    { marginBottom:16 },
  searchInput:  { width:"100%", padding:"20px 20px", border:"1.5px solid #e2c4e2", borderRadius:30, fontSize:14, outline:"none", fontFamily:"sans-serif", background:"white", color:"#3b0764", boxSizing:"border-box" },

  catRow:       { display:"flex", flexWrap:"wrap", gap:15, marginBottom:28 },
  catBtn:       { padding:"8px 18px", border:"1.5px solid #e2c4e2", borderRadius:20, background:"white", cursor:"pointer", fontSize:13, fontFamily:"sans-serif", color:"#9d6b9d", transition:"all 0.2s" },
  catBtnActive: { background:"linear-gradient(135deg,#9d4edd,#c77dff)", color:"white", borderColor:"transparent" },
  catBadge:     { display:"inline-block", padding:"8px 22px", borderRadius:20, background:"linear-gradient(135deg,#f3e8ff,#fce7f3)", color:"#7c3aed", fontSize:11, fontFamily:"sans-serif", letterSpacing:0.5, marginBottom:10, fontWeight:600 },

  grid:         { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:24 },
  card:         { background:"white", borderRadius:16, boxShadow:"0 4px 20px rgba(157,107,157,0.10)", overflow:"hidden", transition:"all 0.2s", border:"1px solid #f3e8ff" },
  cardBody:     { padding:50 },
  cardTitle:    { fontSize:20, fontWeight:700, color:"#3b0764", margin:"0 0 15px", fontFamily:"Cormorant Garamond, serif", lineHeight:1.4 },
  cardExcerpt:  { fontSize:16, color:"#9d6b9d", lineHeight:1.7, marginBottom:14, fontFamily:"sans-serif" },
  cardMeta:     { display:"flex", justifyContent:"space-between", fontSize:12, color:"#b89ec4", fontFamily:"sans-serif", marginBottom:14 },
  cardActions:  { display:"flex", gap:8, alignItems:"center" },

  actionBtn:    { padding:"7px 14px", border:"none", borderRadius:20, cursor:"pointer", fontSize:13, fontFamily:"sans-serif", fontWeight:500, transition:"all 0.2s" },
  readBtn:      { marginLeft:"auto", padding:"15px 22px", background:"linear-gradient(135deg,#9d4edd,#c77dff)", color:"white", border:"none", borderRadius:20, cursor:"pointer", fontSize:13, fontFamily:"sans-serif", fontWeight:500 },
  writeBtn:     { display:"inline-flex", alignItems:"center", gap:8, padding:"23px 38px", background:"linear-gradient(135deg,#9b72cf,#e8637a)", color:"white", border:"none", borderRadius:14, cursor:"pointer", fontSize:"1rem", fontFamily:"sans-serif", fontWeight:600, marginTop:8, transition:"all 0.2s" },

  empty:        { textAlign:"center", color:"#9d6b9d", fontFamily:"sans-serif", fontSize:14 },
  emptyBox:     { textAlign:"center", padding:"60px 40px" },

  backBtn:      { background:"#f3e8ff", border:"none", borderRadius:20, padding:"10px 22px", cursor:"pointer", fontSize:13, color:"#7c3aed", fontFamily:"sans-serif", fontWeight:500, marginBottom:24 },
  detailCard:   { background:"white", borderRadius:20, boxShadow:"0 4px 24px rgba(157,107,157,0.12)", overflow:"hidden" },
  detailTitle:  { fontFamily:"Cormorant Garamond, serif", fontSize:32, fontWeight:600, color:"#3b0764", margin:"0 0 12px", lineHeight:1.3 },
  detailMeta:   { fontSize:23, color:"#b89ec4", fontFamily:"sans-serif", marginBottom:24, paddingBottom:20, borderBottom:"1px solid #f3e8ff" },
  detailContent:{ fontSize:20, color:"#3b0764", lineHeight:1.9, fontFamily:"sans-serif", whiteSpace:"pre-wrap", marginBottom:32 },
  ratingBox:    { background:"#faf5ff", borderRadius:14, padding:20, border:"1px solid #f3e8ff" },

  formWrap:     { maxWidth:1000, margin:"0 auto" },
  formCard:     { background:"white", borderRadius:20, padding:36, boxShadow:"0 4px 20px rgba(157,107,157,0.10)" },
  formTitle:    { fontFamily:"Cormorant Garamond, serif", fontSize:28, fontWeight:600, color:"#3b0764", margin:"0 0 8px" },
  formSub:      { fontSize:23, color:"#9d6b9d", fontFamily:"sans-serif", marginBottom:28 },
  formGroup:    { marginBottom:20 },
  label:        { display:"block", fontSize:10, letterSpacing:2, color:"#c084c4", fontFamily:"sans-serif", marginBottom:8, fontWeight:600 },
  input:        { width:"100%", padding:"12px 16px", border:"1.5px solid #e2c4e2", borderRadius:12, fontSize:14, outline:"none", fontFamily:"sans-serif", background:"#fdf8ff", color:"#3b0764", boxSizing:"border-box", transition:"border 0.2s" },
};
