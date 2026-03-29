import { useState, useEffect } from "react";
import axios from "axios";

const API    = "http://localhost:5000/api/exercises";
const BMIAPI = "http://localhost:5000/api/lifestyle/bmi";
const user   = JSON.parse(localStorage.getItem("user") || "{}");
const USER_ID = user._id || "";

const CATEGORIES  = ["All", "Cardio", "Strength", "Yoga", "Flexibility"];
const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];

const CAT_META = {
  All:         { icon:"🏋️", color:"#6b3fa0", bg:"#f0e8fb", grad:"linear-gradient(135deg,#6b3fa0,#c084b0)" },
  Cardio:      { icon:"🏃", color:"#e8637a", bg:"#fde8ec", grad:"linear-gradient(135deg,#e8637a,#f4a7b9)" },
  Strength:    { icon:"💪", color:"#9b72cf", bg:"#f0e8fb", grad:"linear-gradient(135deg,#9b72cf,#c084b0)" },
  Yoga:        { icon:"🧘", color:"#4caf78", bg:"#eaf8f0", grad:"linear-gradient(135deg,#4caf78,#a8dbc9)" },
  Flexibility: { icon:"🤸", color:"#f4a261", bg:"#fef3eb", grad:"linear-gradient(135deg,#f4a261,#f4c5a0)" },
};

const DIFF_META = {
  Easy:   { color:"#4caf78", bg:"#edfbf3", icon:"🟢" },
  Medium: { color:"#f4a261", bg:"#fef3eb", icon:"🟡" },
  Hard:   { color:"#e8637a", bg:"#fff0f4", icon:"🔴" },
};

const YOUTUBE_VIDEOS = {
  "Brisk Walking":         "https://www.youtube.com/embed/njeZ29umqVE",
  "Jumping Jacks":         "https://www.youtube.com/embed/iSSAk4XCsRA",
  "High Knees":            "https://www.youtube.com/embed/ZZZoCNMU48U",
  "Burpees":               "https://www.youtube.com/embed/dZgVxmf6jkA",
  "Jump Rope":             "https://www.youtube.com/embed/u3zgHI8QnqE",
  "Cycling":               "https://www.youtube.com/embed/iRZEGnHLqfI",
  "Swimming":              "https://www.youtube.com/embed/5HLW2AI9nkU",
  "Push-Ups":              "https://www.youtube.com/embed/IODxDxX7oi4",
  "Squats":                "https://www.youtube.com/embed/aclHkVaku9U",
  "Lunges":                "https://www.youtube.com/embed/QOVaHwm-Q6U",
  "Plank":                 "https://www.youtube.com/embed/pSHjTRCQxIw",
  "Glute Bridges":         "https://www.youtube.com/embed/wPM8icPu6H8",
  "Mountain Climbers":     "https://www.youtube.com/embed/nmwgirgXLYM",
  "Sun Salutation":        "https://www.youtube.com/embed/pmDtSFQxqKE",
  "Warrior I":             "https://www.youtube.com/embed/k0CnbXc0XCo",
  "Child's Pose":          "https://www.youtube.com/embed/2MJGg-dUKh0",
  "Tree Pose":             "https://www.youtube.com/embed/wdln9qWYloU",
  "Downward Dog":          "https://www.youtube.com/embed/j97SSGsnCAQ",
  "Butterfly Stretch":     "https://www.youtube.com/embed/3BEHDhHoOaI",
  "Cat-Cow Stretch":       "https://www.youtube.com/embed/kqnua4rHVVA",
  "Hip Flexor Stretch":    "https://www.youtube.com/embed/YqF8-kpHGpI",
  "Standing Forward Fold": "https://www.youtube.com/embed/g7Uhp5tphAs",
  "Seated Spinal Twist":   "https://www.youtube.com/embed/t-exSPSQfg0",
  "Shoulder Rolls":        "https://www.youtube.com/embed/DwKHGCFMG0Y",
};

function getBMICategory(bmi) {
  if (!bmi) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25)   return "Normal";
  if (bmi < 30)   return "Overweight";
  return "Obese";
}

function getRecommendedCategory(bmiCategory) {
  if (bmiCategory === "Underweight") return "Strength";
  if (bmiCategory === "Overweight" || bmiCategory === "Obese") return "Cardio";
  return "Yoga";
}

export default function ExercisePage() {
  const [exercises, setExercises]         = useState([]);
  const [todos, setTodos]                 = useState([]);
  const [completedIds, setCompletedIds]   = useState([]);
  const [category, setCategory]           = useState("All");
  const [difficulty, setDifficulty]       = useState("All");
  const [selected, setSelected]           = useState(null);
  const [activeTab, setActiveTab]         = useState("browse");
  const [bmiData, setBmiData]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [todoMsg, setTodoMsg]             = useState("");
  const [search, setSearch]               = useState("");
  const [showVideo, setShowVideo]         = useState(false);

  useEffect(() => {
    fetchExercises();
    fetchTodos();
    fetchCompletedIds();
    fetchBMI();
  }, []);

  useEffect(() => { fetchExercises(); }, [category, difficulty]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== "All") params.category = category;
      if (difficulty !== "All") params.difficulty = difficulty;
      const { data } = await axios.get(API, { params });
      if (data.success) setExercises(data.exercises);
    } catch {}
    setLoading(false);
  };

  const fetchTodos = async () => {
    try {
      const { data } = await axios.get(`${API}/todo/${USER_ID}`);
      if (data.success) setTodos(data.todos);
    } catch {}
  };

  const fetchCompletedIds = async () => {
    try {
      const { data } = await axios.get(`${API}/log/${USER_ID}`);
      if (data.success) setCompletedIds(data.completedIds);
    } catch {}
  };

  const fetchBMI = async () => {
    try {
      const { data } = await axios.get(`${BMIAPI}/${USER_ID}`);
      if (data.success && data.records?.length > 0) setBmiData(data.records[0]);
    } catch {}
  };

  const handleAddTodo = async (exercise) => {
    try {
      const { data } = await axios.post(`${API}/todo`, { userId: USER_ID, title: exercise.name });
      if (data.success) {
        setTodos(prev => [...prev, data.todo]);
        setTodoMsg(`✅ "${exercise.name}" added to your list!`);
        setTimeout(() => setTodoMsg(""), 3000);
      } else {
        setTodoMsg("Already in your list!");
        setTimeout(() => setTodoMsg(""), 2000);
      }
    } catch {}
  };

  const handleToggleTodo = async (id) => {
    try {
      const { data } = await axios.patch(`${API}/todo/${id}`);
      if (data.success) setTodos(prev => prev.map(t => t._id === id ? data.todo : t));
    } catch {}
  };

  const handleDeleteTodo = async (id) => {
    try {
      await axios.delete(`${API}/todo/${id}`);
      setTodos(prev => prev.filter(t => t._id !== id));
    } catch {}
  };

  const handleLogComplete = async (exerciseId) => {
    try {
      await axios.post(`${API}/log`, { userId: USER_ID, exerciseId });
      setCompletedIds(prev => [...prev, exerciseId]);
    } catch {}
  };

  const openDetail = (ex) => {
    setSelected(ex);
    setShowVideo(false);
    window.scrollTo(0, 0);
  };

  const bmiCategory    = getBMICategory(bmiData?.bmi);
  const recommendedCat = getRecommendedCategory(bmiCategory);
  const completedTodos = todos.filter(t => t.completed).length;
  const totalTodos     = todos.length;

  const filteredExercises = exercises.filter(ex =>
    search === "" || ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { key:"browse",  icon:"🏋️", label:"Browse" },
    { key:"suggest", icon:"✨", label:"Suggested For You" },
    { key:"todo",    icon:"📋", label:`My List (${todos.length})` },
  ];

  // ════════════════════════════════════
  //  DETAIL VIEW
  // ════════════════════════════════════
  if (selected) {
    const cat   = CAT_META[selected.category] || CAT_META.All;
    const diff  = DIFF_META[selected.difficulty] || DIFF_META.Easy;
    const steps = selected.instructions?.split("\n").filter(s => s.trim()) || [];
    const isDone = completedIds.includes(selected._id);
    const videoUrl = YOUTUBE_VIDEOS[selected.name];

    return (
      <div style={S.wrapper}>
        <style>{CSS}</style>
        <div style={S.detailPage}>
          <button className="back-btn" onClick={() => setSelected(null)} style={S.backBtn}>
            ← Back to Exercises
          </button>

          <div style={S.detailGrid}>

            {/* ── LEFT ── */}
            <div>
              {/* Media box */}
              <div style={{ borderRadius:24, overflow:"hidden", boxShadow:"0 16px 48px rgba(107,63,160,0.2)", position:"relative", background:"#000", minHeight:340 }}>
                {showVideo && videoUrl ? (
                  <iframe
                    width="100%"
                    height="340"
                    src={`${videoUrl}?autoplay=1&rel=0`}
                    title={selected.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ display:"block" }}
                  />
                ) : (
                  <img src={selected.image} alt={selected.name}
                    style={{ width:"100%", height:340, objectFit:"cover", display:"block" }}/>
                )}

                {/* Toggle buttons */}
                <div style={{ position:"absolute", bottom:14, right:14, display:"flex", gap:8 }}>
                  <button onClick={() => setShowVideo(false)}
                    style={{ padding:"8px 18px", border:"none", borderRadius:20, background: !showVideo ? "white" : "rgba(255,255,255,0.55)", color:"#6b3fa0", fontWeight:700, cursor:"pointer", fontSize:"0.82rem", fontFamily:"Plus Jakarta Sans, sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", transition:"all 0.2s" }}>
                    📸 Photo
                  </button>
                  <button onClick={() => setShowVideo(true)}
                    style={{ padding:"8px 18px", border:"none", borderRadius:20, background: showVideo ? "#e8637a" : "rgba(255,255,255,0.55)", color: showVideo ? "white" : "#e8637a", fontWeight:700, cursor:"pointer", fontSize:"0.82rem", fontFamily:"Plus Jakarta Sans, sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", transition:"all 0.2s" }}>
                    🎬 Watch Video
                  </button>
                </div>
              </div>

              {/* Info grid */}
              <div style={{ ...S.card, marginTop:20 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {[
                    { label:"Category",   value:selected.category,   icon:cat.icon,  color:cat.color },
                    { label:"Difficulty", value:selected.difficulty, icon:diff.icon, color:diff.color },
                    { label:"Duration",   value:selected.duration,   icon:"⏱",       color:"#6b3fa0" },
                    { label:"Type",       value:"Guided",            icon:"📖",       color:"#4a9eca" },
                  ].map((info, i) => (
                    <div key={i} style={{ background:"#faf5ff", borderRadius:14, padding:16, textAlign:"center" }}>
                      <div style={{ fontSize:"1.8rem", marginBottom:6 }}>{info.icon}</div>
                      <div style={{ fontSize:"0.7rem", color:"#b89ec4", textTransform:"uppercase", letterSpacing:1, fontWeight:700 }}>{info.label}</div>
                      <div style={{ fontSize:"1rem", fontWeight:700, color:info.color, marginTop:4 }}>{info.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:12, marginTop:20 }}>
                  <button className="primary-btn"
                    onClick={() => !isDone && handleLogComplete(selected._id)}
                    style={{ ...S.primaryBtn, flex:1, background: isDone ? "linear-gradient(135deg,#4caf78,#2d9b5c)" : cat.grad }}>
                    {isDone ? "✅ Completed Today!" : "✓ Mark as Done"}
                  </button>
                  <button className="outline-btn"
                    onClick={() => handleAddTodo(selected)}
                    style={{ ...S.outlineBtn, flex:1 }}>
                    📋 Add to My List
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT ── */}
            <div>
              <div style={{ marginBottom:10 }}>
                <span style={{ ...S.catBadge, background:cat.bg, color:cat.color }}>{cat.icon} {selected.category}</span>
                <span style={{ ...S.catBadge, background:diff.bg, color:diff.color, marginLeft:8 }}>{diff.icon} {selected.difficulty}</span>
              </div>
              <h1 style={S.detailTitle}>{selected.name}</h1>
              <div style={{ marginBottom:28 }}>
                <span style={{ fontSize:"0.9rem", color:"#9b72cf", fontWeight:600 }}>⏱ {selected.duration}</span>
              </div>

              <h3 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.4rem", color:"#6b3fa0", marginBottom:20 }}>
                📋 Step-by-Step Instructions
              </h3>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {steps.map((step, i) => (
                  <div key={i} className="step-item"
                    style={{ display:"flex", gap:16, alignItems:"flex-start", background:"#faf5ff", borderRadius:16, padding:"16px 20px", border:"1px solid #f0e8fb", animation:`fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s both` }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#9b72cf,#e8637a)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.9rem", flexShrink:0 }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize:"0.95rem", color:"#3b0764", lineHeight:1.7, paddingTop:6 }}>
                      {step.replace(/^\d+\.\s*/, "")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pro Tips */}
              <div style={{ ...S.card, marginTop:24, background:"linear-gradient(135deg,#f0e8fb,#fde8ec)", border:"none" }}>
                <h4 style={{ fontSize:"1rem", fontWeight:700, color:"#6b3fa0", marginBottom:12 }}>💡 Pro Tips</h4>
                <ul style={{ paddingLeft:20, color:"#7a5490", fontSize:"0.88rem", lineHeight:2.2 }}>
                  <li>Warm up for 5 minutes before starting</li>
                  <li>Stay hydrated — drink water before, during and after</li>
                  <li>Stop if you feel sharp pain — discomfort is normal, pain is not</li>
                  <li>Consistency matters more than intensity — do this regularly</li>
                  <li>Cool down and stretch after finishing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════
  //  MAIN PAGE
  // ════════════════════════════════════
  return (
    <div style={S.wrapper}>
      <style>{CSS}</style>

      {/* HERO */}
      <div style={S.hero}>
        <div style={S.heroOverlay}/>
        <div style={S.heroContent}>
          <p style={S.heroSub}>MOVE YOUR BODY</p>
          <h1 style={S.heroTitle}>Exercise Guidance</h1>
          <div style={S.heroDivider}/>
          <p style={S.heroDesc}>Discover exercises tailored for you. Track progress and build healthy habits.</p>
          <div style={S.statsBar}>
            <div style={S.statItem}>
              <div style={S.statNum}>{exercises.length}</div>
              <div style={S.statLabel}>Exercises</div>
            </div>
            <div style={S.statDivider}/>
            <div style={S.statItem}>
              <div style={S.statNum}>{completedIds.length}</div>
              <div style={S.statLabel}>Done Today</div>
            </div>
            <div style={S.statDivider}/>
            <div style={S.statItem}>
              <div style={S.statNum}>{totalTodos > 0 ? `${completedTodos}/${totalTodos}` : "0"}</div>
              <div style={S.statLabel}>List Progress</div>
            </div>
            {bmiData && (<>
              <div style={S.statDivider}/>
              <div style={S.statItem}>
                <div style={S.statNum}>{bmiData.bmi}</div>
                <div style={S.statLabel}>Your BMI</div>
              </div>
            </>)}
          </div>
        </div>
      </div>

      <div style={S.page}>

        {/* TABS */}
        <div style={S.tabsBar}>
          {TABS.map(t => (
            <button key={t.key} className="tab-btn"
              style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }}
              onClick={() => setActiveTab(t.key)}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ══════════ BROWSE ══════════ */}
        {activeTab === "browse" && (
          <div>
            {/* Category cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16, marginBottom:28 }}>
              {CATEGORIES.map(c => {
                const meta = CAT_META[c];
                return (
                  <button key={c} className="cat-card"
                    onClick={() => setCategory(c)}
                    style={{ ...S.catCard, background: category===c ? meta.grad : meta.bg, color: category===c ? "white" : meta.color, boxShadow: category===c ? `0 8px 24px ${meta.color}44` : "none" }}>
                    <span style={{ fontSize:"2.2rem" }}>{meta.icon}</span>
                    <span style={{ fontSize:"0.9rem", fontWeight:700 }}>{c}</span>
                    <span style={{ fontSize:"0.75rem", opacity:0.8 }}>
                      {exercises.filter(e => c==="All" || e.category===c).length} exercises
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div style={{ display:"flex", gap:16, marginBottom:24, alignItems:"center", flexWrap:"wrap" }}>
              <input style={S.searchInput} placeholder="🔍 Search exercises..."
                value={search} onChange={e => setSearch(e.target.value)}/>
              <div style={{ display:"flex", gap:8 }}>
                {DIFFICULTIES.map(d => (
                  <button key={d}
                    style={{ ...S.diffBtn, ...(difficulty===d ? { background: d==="All" ? "#6b3fa0" : DIFF_META[d]?.color||"#6b3fa0", color:"white", borderColor:"transparent" } : {}) }}
                    onClick={() => setDifficulty(d)}>
                    {d !== "All" && DIFF_META[d]?.icon} {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress */}
            {completedIds.length > 0 && (
              <div style={{ ...S.card, marginBottom:24, background:"linear-gradient(135deg,#edfbf3,#d4f5e5)", border:"1.5px solid #4caf7844" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontWeight:700, color:"#2d7a50", fontSize:"0.95rem" }}>🔥 Today's Progress</span>
                  <span style={{ fontWeight:700, color:"#4caf78", fontSize:"1.1rem" }}>{completedIds.length} done!</span>
                </div>
                <div style={{ background:"rgba(76,175,120,0.2)", borderRadius:8, height:10, overflow:"hidden" }}>
                  <div style={{ width:`${Math.min(100,(completedIds.length/exercises.length)*100)}%`, height:"100%", background:"linear-gradient(90deg,#4caf78,#2d9b5c)", borderRadius:8, transition:"width 0.5s ease" }}/>
                </div>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign:"center", padding:60, color:"#9d6b9d" }}>Loading exercises...</div>
            ) : (
              <div style={S.exGrid}>
                {filteredExercises.map((ex, i) => {
                  const cat  = CAT_META[ex.category] || CAT_META.All;
                  const diff = DIFF_META[ex.difficulty] || DIFF_META.Easy;
                  const done = completedIds.includes(ex._id);
                  return (
                    <div key={ex._id} className="ex-card"
                      style={{ ...S.exCard, animationDelay:`${i*0.04}s`, outline: done ? "2px solid #4caf78" : "none" }}>
                      <div style={{ position:"relative" }}>
                        <img src={ex.image} alt={ex.name}
                          style={{ width:"100%", height:180, objectFit:"cover", borderRadius:"16px 16px 0 0" }}/>
                        <div style={{ position:"absolute", top:12, left:12 }}>
                          <span style={{ ...S.catBadge, background:cat.color, color:"white", fontSize:"0.72rem" }}>{cat.icon} {ex.category}</span>
                        </div>
                        <div style={{ position:"absolute", top:12, right:12 }}>
                          <span style={{ ...S.catBadge, background:diff.bg, color:diff.color, fontSize:"0.72rem" }}>{diff.icon} {ex.difficulty}</span>
                        </div>
                        {done && (
                          <div style={{ position:"absolute", inset:0, background:"rgba(76,175,120,0.3)", borderRadius:"16px 16px 0 0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <span style={{ fontSize:"3rem" }}>✅</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding:"18px 20px 20px" }}>
                        <h3 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.2rem", fontWeight:600, color: done ? "#4caf78" : "#3b0764", marginBottom:6 }}>
                          {ex.name}
                        </h3>
                        <span style={{ fontSize:"0.82rem", color:"#9b72cf", fontWeight:600 }}>⏱ {ex.duration}</span>
                        <p style={{ fontSize:"0.82rem", color:"#9d6b9d", lineHeight:1.6, margin:"10px 0 16px",
                          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                          {ex.instructions?.split("\n")[0]?.replace(/^1\.\s*/, "")}
                        </p>
                        <div style={{ display:"flex", gap:8 }}>
                          <button className="primary-btn"
                            onClick={() => openDetail(ex)}
                            style={{ ...S.primaryBtn, flex:1, fontSize:"0.85rem", padding:"10px 0" }}>
                            View Details
                          </button>
                          <button className="icon-btn" onClick={() => handleAddTodo(ex)} style={S.iconBtn} title="Add to list">📋</button>
                          <button className="icon-btn"
                            onClick={() => !done && handleLogComplete(ex._id)}
                            style={{ ...S.iconBtn, background: done ? "#edfbf3" : "#f0e8fb", color: done ? "#4caf78" : "#9b72cf" }}
                            title={done ? "Done!" : "Mark complete"}>
                            {done ? "✅" : "✓"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ SUGGESTED ══════════ */}
        {activeTab === "suggest" && (
          <div>
            {bmiData ? (
              <>
                <div className="fade-in" style={{ ...S.card, marginBottom:28, background:"linear-gradient(135deg,#6b3fa0,#c084b0,#e8637a)", color:"white", padding:32 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:24 }}>
                    <div style={{ fontSize:"4rem" }}>
                      {bmiData.bmi < 18.5 ? "📉" : bmiData.bmi < 25 ? "✅" : bmiData.bmi < 30 ? "⚠️" : "🩺"}
                    </div>
                    <div>
                      <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.8rem", fontWeight:700, marginBottom:6 }}>
                        Based on Your BMI: {bmiData.bmi} ({bmiCategory})
                      </div>
                      <div style={{ fontSize:"1rem", opacity:0.9 }}>
                        We recommend focusing on <strong>{recommendedCat}</strong> exercises.
                      </div>
                    </div>
                    <div style={{ marginLeft:"auto", textAlign:"center", background:"rgba(255,255,255,0.15)", borderRadius:16, padding:"16px 24px" }}>
                      <div style={{ fontSize:"2.5rem", fontWeight:700 }}>{bmiData.bmi}</div>
                      <div style={{ fontSize:"0.8rem", opacity:0.85 }}>BMI Score</div>
                    </div>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, marginBottom:28 }}>
                  {(bmiCategory === "Underweight" ? [
                    { cat:"Strength",    reason:"Build muscle mass and increase body weight healthily", priority:"Primary",       icon:"💪" },
                    { cat:"Yoga",        reason:"Improve flexibility and reduce stress",                 priority:"Secondary",     icon:"🧘" },
                    { cat:"Flexibility", reason:"Support muscle recovery and joint health",              priority:"Supplementary", icon:"🤸" },
                  ] : bmiCategory === "Overweight" || bmiCategory === "Obese" ? [
                    { cat:"Cardio",   reason:"Burns calories and improves cardiovascular health", priority:"Primary",       icon:"🏃" },
                    { cat:"Strength", reason:"Build muscle to boost metabolism long-term",        priority:"Secondary",     icon:"💪" },
                    { cat:"Yoga",     reason:"Reduce stress hormones that cause weight gain",    priority:"Supplementary", icon:"🧘" },
                  ] : [
                    { cat:"Cardio",   reason:"Maintain cardiovascular fitness and healthy weight", priority:"Primary",       icon:"🏃" },
                    { cat:"Strength", reason:"Maintain muscle mass and bone density",              priority:"Secondary",     icon:"💪" },
                    { cat:"Yoga",     reason:"Flexibility, balance and mental wellness",           priority:"Supplementary", icon:"🧘" },
                  ]).map((rec, i) => {
                    const meta = CAT_META[rec.cat];
                    return (
                      <div key={i} className="fade-in" style={{ ...S.card, background:meta.bg, border:`2px solid ${meta.color}33`, animationDelay:`${i*0.1}s` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                          <span style={{ fontSize:"2rem" }}>{rec.icon}</span>
                          <span style={{ fontSize:"0.72rem", fontWeight:700, padding:"4px 12px", borderRadius:20, background:meta.color, color:"white" }}>{rec.priority}</span>
                        </div>
                        <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.3rem", fontWeight:600, color:meta.color, marginBottom:8 }}>{rec.cat}</div>
                        <div style={{ fontSize:"0.85rem", color:"#7a5490", lineHeight:1.7, marginBottom:16 }}>{rec.reason}</div>
                        <button className="primary-btn"
                          onClick={() => { setCategory(rec.cat); setActiveTab("browse"); }}
                          style={{ ...S.primaryBtn, width:"100%", background:meta.grad, fontSize:"0.85rem", padding:"10px 0", marginTop:0 }}>
                          Browse {rec.cat} →
                        </button>
                      </div>
                    );
                  })}
                </div>

                <h2 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.8rem", color:"#6b3fa0", marginBottom:20 }}>
                  ✨ Top Picks for You
                </h2>
                <div style={S.exGrid}>
                  {exercises.filter(ex => ex.category === recommendedCat).map((ex, i) => {
                    const cat  = CAT_META[ex.category] || CAT_META.All;
                    const diff = DIFF_META[ex.difficulty] || DIFF_META.Easy;
                    const done = completedIds.includes(ex._id);
                    return (
                      <div key={ex._id} className="ex-card" style={{ ...S.exCard, animationDelay:`${i*0.05}s` }}>
                        <div style={{ position:"relative" }}>
                          <img src={ex.image} alt={ex.name} style={{ width:"100%", height:180, objectFit:"cover", borderRadius:"16px 16px 0 0" }}/>
                          <div style={{ position:"absolute", top:12, right:12 }}>
                            <span style={{ ...S.catBadge, background:diff.bg, color:diff.color, fontSize:"0.72rem" }}>{diff.icon} {ex.difficulty}</span>
                          </div>
                          {done && (
                            <div style={{ position:"absolute", inset:0, background:"rgba(76,175,120,0.3)", borderRadius:"16px 16px 0 0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ fontSize:"3rem" }}>✅</span>
                            </div>
                          )}
                        </div>
                        <div style={{ padding:"18px 20px 20px" }}>
                          <h3 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.2rem", fontWeight:600, color:"#3b0764", marginBottom:6 }}>{ex.name}</h3>
                          <span style={{ fontSize:"0.82rem", color:cat.color, fontWeight:600 }}>⏱ {ex.duration}</span>
                          <div style={{ display:"flex", gap:8, marginTop:14 }}>
                            <button className="primary-btn" onClick={() => openDetail(ex)}
                              style={{ ...S.primaryBtn, flex:1, fontSize:"0.85rem", padding:"10px 0", background:cat.grad }}>
                              View Details
                            </button>
                            <button className="icon-btn" onClick={() => handleAddTodo(ex)} style={S.iconBtn}>📋</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"80px 40px" }}>
                <div style={{ fontSize:"4rem", marginBottom:16 }}>⚖️</div>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.8rem", color:"#6b3fa0", marginBottom:12 }}>No BMI Data Yet</div>
                <div style={{ fontSize:"1rem", color:"#9d6b9d", marginBottom:28 }}>
                  Calculate your BMI in the Lifestyle Tracker to get personalized recommendations.
                </div>
                <button className="primary-btn" style={{ ...S.primaryBtn, fontSize:"1rem", padding:"14px 32px" }}
                  onClick={() => window.location.href = "/health/lifestyle"}>
                  Go to Lifestyle Tracker →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TO-DO ══════════ */}
        {activeTab === "todo" && (
          <div style={{ maxWidth:800, margin:"0 auto" }}>
            <div className="fade-in" style={{ ...S.card, marginBottom:24, padding:28 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h3 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.4rem", color:"#6b3fa0" }}>My Exercise List</h3>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"2rem", fontWeight:700, color: completedTodos===totalTodos && totalTodos>0 ? "#4caf78" : "#9b72cf" }}>
                  {completedTodos}/{totalTodos}
                </div>
              </div>
              {totalTodos > 0 && (
                <>
                  <div style={{ background:"#f0e8fb", borderRadius:8, height:12, overflow:"hidden", marginBottom:8 }}>
                    <div style={{ width:`${(completedTodos/totalTodos)*100}%`, height:"100%", background:"linear-gradient(90deg,#9b72cf,#e8637a)", borderRadius:8, transition:"width 0.5s ease" }}/>
                  </div>
                  <div style={{ fontSize:"0.85rem", color:"#b89ec4" }}>
                    {completedTodos === totalTodos ? "🎉 All done! Great work!" : `${totalTodos - completedTodos} exercises remaining`}
                  </div>
                </>
              )}
            </div>

            {todoMsg && (
              <div style={{ ...S.card, marginBottom:16, background:"#edfbf3", border:"1.5px solid #4caf7844", color:"#2d7a50", fontWeight:600, padding:"14px 20px" }}>
                {todoMsg}
              </div>
            )}

            {todos.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", padding:60 }}>
                <div style={{ fontSize:"4rem", marginBottom:16 }}>📋</div>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.6rem", color:"#6b3fa0", marginBottom:12 }}>Your list is empty</div>
                <div style={{ fontSize:"0.95rem", color:"#9d6b9d", marginBottom:24 }}>Browse exercises and click 📋 to add them here.</div>
                <button className="primary-btn" style={{ ...S.primaryBtn, fontSize:"1rem", padding:"14px 32px" }}
                  onClick={() => setActiveTab("browse")}>
                  Browse Exercises →
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {todos.map((todo, i) => (
                  <div key={todo._id} className="fade-in todo-item"
                    style={{ ...S.card, display:"flex", alignItems:"center", gap:16, padding:"18px 24px",
                      animationDelay:`${i*0.05}s`,
                      background: todo.completed ? "#edfbf3" : "white",
                      border: todo.completed ? "1.5px solid #4caf7844" : "1px solid rgba(155,114,207,0.08)",
                      opacity: todo.completed ? 0.85 : 1 }}>
                    <button onClick={() => handleToggleTodo(todo._id)}
                      style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${todo.completed ? "#4caf78" : "#c084b0"}`, background: todo.completed ? "#4caf78" : "transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                      {todo.completed && <span style={{ color:"white", fontSize:"0.9rem", fontWeight:700 }}>✓</span>}
                    </button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"1rem", fontWeight:600, color: todo.completed ? "#4caf78" : "#3b0764", textDecoration: todo.completed ? "line-through" : "none" }}>
                        {todo.title}
                      </div>
                      <div style={{ fontSize:"0.78rem", color:"#b89ec4", marginTop:2 }}>
                        {todo.completed ? "✅ Completed" : "⏳ Pending"}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTodo(todo._id)}
                      style={{ background:"#fff0f4", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", color:"#e8637a", fontSize:"0.9rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      ✕
                    </button>
                  </div>
                ))}
                {completedTodos > 0 && (
                  <button onClick={() => todos.filter(t=>t.completed).forEach(t=>handleDeleteTodo(t._id))}
                    style={{ ...S.outlineBtn, alignSelf:"center", marginTop:8, fontSize:"0.88rem", padding:"10px 24px" }}>
                    🗑 Clear Completed ({completedTodos})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  CSS
// ══════════════════════════════════════
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .fade-in  { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .ex-card  { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .ex-card:hover       { transform:translateY(-6px)!important; box-shadow:0 16px 48px rgba(107,63,160,0.18)!important; }
  .cat-card:hover      { transform:translateY(-4px)!important; box-shadow:0 12px 32px rgba(107,63,160,0.2)!important; }
  .tab-btn:hover       { background:rgba(155,114,207,0.08)!important; }
  .back-btn:hover      { background:#f0e8fb!important; transform:translateX(-3px); }
  .primary-btn:hover   { transform:translateY(-3px)!important; box-shadow:0 12px 32px rgba(155,114,207,0.4)!important; }
  .outline-btn:hover   { background:#f0e8fb!important; }
  .icon-btn:hover      { transform:scale(1.1); }
  .todo-item:hover     { transform:translateX(4px); }
  .step-item:hover     { background:linear-gradient(135deg,#f0e8fb,#fde8ec)!important; transform:translateX(6px); border-color:#c084b044!important; }
`;

// ══════════════════════════════════════
//  STYLES
// ══════════════════════════════════════
const S = {
  wrapper:     { minHeight:"100vh", background:"#faf5ff", fontFamily:"Plus Jakarta Sans, sans-serif" },
  hero:        { position:"relative", minHeight:280, overflow:"hidden", background:"linear-gradient(135deg,#1e0a2e 0%,#6b3fa0 55%,#e8637a 100%)" },
  heroOverlay: { position:"absolute", inset:0, background:"url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400') center/cover", opacity:0.12 },
  heroContent: { position:"relative", zIndex:1, padding:"48px 48px 36px" },
  heroSub:     { fontSize:"0.72rem", letterSpacing:5, color:"rgba(255,255,255,0.7)", fontWeight:600, marginBottom:10 },
  heroTitle:   { fontFamily:"Cormorant Garamond, serif", fontSize:"3.5rem", fontWeight:700, color:"white", lineHeight:1.1, marginBottom:12 },
  heroDivider: { width:60, height:3, background:"rgba(255,255,255,0.5)", borderRadius:2, marginBottom:14 },
  heroDesc:    { fontSize:"1rem", color:"rgba(255,255,255,0.85)", lineHeight:1.6, maxWidth:600, marginBottom:28 },
  statsBar:    { display:"flex", alignItems:"center", background:"rgba(255,255,255,0.12)", backdropFilter:"blur(12px)", borderRadius:16, padding:"16px 28px", width:"fit-content", border:"1px solid rgba(255,255,255,0.2)" },
  statItem:    { textAlign:"center", padding:"0 24px" },
  statNum:     { fontSize:"1.8rem", fontWeight:700, color:"white", lineHeight:1 },
  statLabel:   { fontSize:"0.72rem", color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:1, marginTop:4 },
  statDivider: { width:1, height:40, background:"rgba(255,255,255,0.25)", margin:"0 4px" },
  page:        { padding:"28px 40px 60px" },
  tabsBar:     { display:"flex", gap:4, background:"white", borderRadius:16, padding:6, marginBottom:28, boxShadow:"0 2px 16px rgba(107,63,160,0.08)", width:"fit-content" },
  tab:         { display:"flex", alignItems:"center", gap:8, padding:"12px 24px", border:"none", background:"transparent", cursor:"pointer", fontSize:"0.92rem", fontWeight:500, color:"#b89ec4", fontFamily:"Plus Jakarta Sans, sans-serif", borderRadius:12, transition:"all 0.2s" },
  tabActive:   { background:"linear-gradient(135deg,#9b72cf,#e8637a)", color:"white", fontWeight:700, boxShadow:"0 4px 16px rgba(155,114,207,0.3)" },
  card:        { background:"white", borderRadius:20, padding:24, boxShadow:"0 2px 16px rgba(107,63,160,0.08)", border:"1px solid rgba(155,114,207,0.08)" },
  catCard:     { display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"20px 16px", border:"none", borderRadius:18, cursor:"pointer", transition:"all 0.25s", fontFamily:"Plus Jakarta Sans, sans-serif" },
  searchInput: { flex:1, padding:"13px 20px", border:"2px solid #f0e8fb", borderRadius:30, fontSize:"0.95rem", outline:"none", fontFamily:"Plus Jakarta Sans, sans-serif", background:"white", color:"#3b0764", minWidth:280 },
  diffBtn:     { padding:"10px 18px", border:"2px solid #f0e8fb", borderRadius:20, background:"white", cursor:"pointer", fontSize:"0.85rem", fontFamily:"Plus Jakarta Sans, sans-serif", color:"#9d6b9d", fontWeight:500, transition:"all 0.2s" },
  exGrid:      { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:22 },
  exCard:      { background:"white", borderRadius:18, boxShadow:"0 4px 20px rgba(107,63,160,0.08)", overflow:"hidden", transition:"all 0.25s", border:"1px solid rgba(155,114,207,0.08)" },
  catBadge:    { display:"inline-block", padding:"5px 12px", borderRadius:20, fontSize:"0.78rem", fontWeight:600, fontFamily:"Plus Jakarta Sans, sans-serif" },
  primaryBtn:  { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, background:"linear-gradient(135deg,#9b72cf,#e8637a)", color:"white", border:"none", borderRadius:12, padding:"12px 24px", fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"0.9rem", fontWeight:600, cursor:"pointer", transition:"all 0.25s", boxShadow:"0 4px 16px rgba(155,114,207,0.25)", marginTop:0 },
  outlineBtn:  { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, background:"transparent", color:"#6b3fa0", border:"2px solid #9b72cf", borderRadius:12, padding:"12px 24px", fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"0.9rem", fontWeight:600, cursor:"pointer", transition:"all 0.25s" },
  iconBtn:     { width:40, height:40, border:"2px solid #f0e8fb", borderRadius:10, background:"#f0e8fb", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", flexShrink:0 },
  backBtn:     { background:"#f0e8fb", border:"none", borderRadius:12, padding:"10px 22px", cursor:"pointer", fontSize:"0.9rem", color:"#6b3fa0", fontFamily:"Plus Jakarta Sans, sans-serif", fontWeight:600, marginBottom:24, transition:"all 0.2s" },
  detailPage:  { maxWidth:"100%", padding:"32px 48px 60px" },
  detailGrid:  { display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:32 },
  detailTitle: { fontFamily:"Cormorant Garamond, serif", fontSize:"2.8rem", fontWeight:700, color:"#3b0764", margin:"12px 0 16px", lineHeight:1.2 },
};
