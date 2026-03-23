import React, { useState, useEffect, useCallback } from "react";
import {
  setupCycleProfile,
  getCycleProfile,
  getDashboard,
  addSymptom,
  getSymptomsForDate,
  getSymptomHistory,
  logTodayPeriod,
  getAllPeriods,
  undoLastPeriod,
} from "../services/api";

const user = JSON.parse(localStorage.getItem("user") || "{}");
const TEMP_USER_ID = user._id || "69bc19440a2698ee36014471";

const SYMPTOM_LIST = [
  { label: "Everything is Fine", emoji: "✅", color: "#4caf78" },
  { label: "Cramps",      emoji: "🔴", color: "#e8637a" },
  { label: "Headache",    emoji: "🟠", color: "#f4845f" },
  { label: "Backache",    emoji: "🟡", color: "#e9b949" },
  { label: "Acne",        emoji: "🟣", color: "#9b72cf" },
  { label: "Fatigue",     emoji: "🔵", color: "#4a9eca" },
  { label: "Bloating",    emoji: "🟢", color: "#4caf78" },
  { label: "Cravings",    emoji: "🍫", color: "#b5651d" },
  { label: "Mood Swings", emoji: "💜", color: "#c084b0" },
  { label: "Nausea",      emoji: "🌀", color: "#5bc8af" },
  { label: "Anxiety",     emoji: "⚡", color: "#f4a261" },
  { label: "Insomnia",    emoji: "🌙", color: "#7b6fa0" },
  { label: "Hot Flashes", emoji: "🔥", color: "#e76f51" },
];

const PHASES = [
  { name: "Menstrual",  days: "Day 1–5",   color: "#e8637a", bg: "#fde8ec", icon: "🩸", desc: "Rest & hydrate. Use heat for cramps." },
  { name: "Follicular", days: "Day 6–13",  color: "#f4a261", bg: "#fef3eb", icon: "🌱", desc: "Energy rises. Great for workouts & plans." },
  { name: "Ovulation",  days: "Day ~14",   color: "#4caf78", bg: "#eaf8f0", icon: "✨", desc: "Peak energy & fertility. You feel great!" },
  { name: "Luteal",     days: "Day 15–28", color: "#9b72cf", bg: "#f3ecfc", icon: "🌙", desc: "PMS may occur. Prioritise self-care." },
];

function fmt(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ═══════════════════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════════════════
function Onboarding({ onComplete }) {
  const [step, setStep]               = useState(1);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lastStart, setLastStart]     = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const handleSave = async () => {
    if (!lastStart) return setError("Please select your last period start date.");
    setSaving(true); setError("");
    try {
      const res = await setupCycleProfile(TEMP_USER_ID, cycleLength, periodLength, lastStart);
      if (res.data.success) onComplete();
      else setError("Something went wrong. Please try again.");
    } catch { setError("Connection error. Is the server running?"); }
    setSaving(false);
  };

  return (
    <div style={S.onboardPage}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        @keyframes floatPulse { 0%,100%{transform:scale(1) translateY(0)} 50%{transform:scale(1.1) translateY(-8px)} }
        @keyframes slideUp { from{transform:translateY(80px);opacity:0} to{transform:translateY(0);opacity:1} }
        .ob-dot { width:28px;height:6px;border-radius:3px;background:rgba(255,255,255,0.25);transition:all 0.35s ease;display:inline-block;margin:0 5px; }
        .ob-dot.active { background:white;width:40px; }
        .ob-minus:hover,.ob-plus:hover { background:linear-gradient(135deg,#9b72cf,#e8637a)!important;color:white!important;border-color:transparent!important;transform:scale(1.08); }
        .ob-next-btn:hover { transform:translateY(-3px);box-shadow:0 10px 30px rgba(155,114,207,0.45)!important; }
        .ob-back-btn:hover { background:#e4d5f5!important; }
        .ob-date-input:focus { border-color:#9b72cf!important;box-shadow:0 0 0 4px rgba(155,114,207,0.12)!important; }
      `}</style>

      <div style={S.onboardTop}>
        <div style={{ fontSize:"4rem", marginBottom:20, filter:"drop-shadow(0 0 24px rgba(244,167,185,0.7))", animation:"floatPulse 3s ease-in-out infinite" }}>🌸</div>
        <h1 style={S.onboardTitle}>Welcome to<br/>SheVerse Health</h1>
        <p style={S.onboardSub}>Let's set up your cycle tracker</p>
        <div style={{ display:"flex", gap:10, marginTop:24 }}>
          {[1,2,3].map(i => <div key={i} className={`ob-dot ${step >= i ? "active" : ""}`}/>)}
        </div>
      </div>

      <div style={S.onboardCard}>
        {step === 1 && (<>
          <div style={S.obQ}>How long is your average cycle?</div>
          <div style={S.obHint}>From first day of period to first day of next period</div>
          <div style={S.obSliderRow}>
            <button className="ob-minus" style={S.obBtn} onClick={() => setCycleLength(v => Math.max(15, v-1))}>−</button>
            <div style={S.obValueBox}>
              <span style={S.obValue}>{cycleLength}</span>
              <span style={S.obUnit}>days</span>
            </div>
            <button className="ob-plus" style={S.obBtn} onClick={() => setCycleLength(v => Math.min(60, v+1))}>+</button>
          </div>
          <input type="range" min="15" max="60" value={cycleLength} onChange={e => setCycleLength(+e.target.value)} style={S.obRange}/>
          <div style={S.obRangeLabels}><span>15</span><span>Normal: 28</span><span>60</span></div>
          <button className="ob-next-btn" style={S.obNextBtn} onClick={() => setStep(2)}>Continue →</button>
        </>)}

        {step === 2 && (<>
          <div style={S.obQ}>How many days does your period last?</div>
          <div style={S.obHint}>Average number of bleeding days per cycle</div>
          <div style={S.obSliderRow}>
            <button className="ob-minus" style={S.obBtn} onClick={() => setPeriodLength(v => Math.max(1, v-1))}>−</button>
            <div style={S.obValueBox}>
              <span style={S.obValue}>{periodLength}</span>
              <span style={S.obUnit}>days</span>
            </div>
            <button className="ob-plus" style={S.obBtn} onClick={() => setPeriodLength(v => Math.min(10, v+1))}>+</button>
          </div>
          <input type="range" min="1" max="10" value={periodLength} onChange={e => setPeriodLength(+e.target.value)} style={S.obRange}/>
          <div style={S.obRangeLabels}><span>1</span><span>Normal: 5</span><span>10</span></div>
          <div style={{ display:"flex", gap:12 }}>
            <button className="ob-back-btn" style={S.obBackBtn} onClick={() => setStep(1)}>← Back</button>
            <button className="ob-next-btn" style={{ ...S.obNextBtn, flex:2 }} onClick={() => setStep(3)}>Continue →</button>
          </div>
        </>)}

        {step === 3 && (<>
          <div style={S.obQ}>When did your last period start?</div>
          <div style={S.obHint}>We'll use this to calculate your next period</div>
          <input type="date" className="ob-date-input" style={S.obDateInput} value={lastStart}
            onChange={e => setLastStart(e.target.value)}
            max={new Date().toISOString().split("T")[0]}/>
          {lastStart && (
            <div style={S.obSummary}>
              <div style={S.obSumRow}><span>Cycle length</span><strong style={{ color:"#6b3fa0" }}>{cycleLength} days</strong></div>
              <div style={S.obSumRow}><span>Period length</span><strong style={{ color:"#6b3fa0" }}>{periodLength} days</strong></div>
              <div style={S.obSumRow}><span>Last start</span><strong style={{ color:"#6b3fa0" }}>{fmt(lastStart)}</strong></div>
            </div>
          )}
          {error && <div style={S.obError}>{error}</div>}
          <div style={{ display:"flex", gap:12 }}>
            <button className="ob-back-btn" style={S.obBackBtn} onClick={() => setStep(2)}>← Back</button>
            <button className="ob-next-btn" style={{ ...S.obNextBtn, flex:2, opacity: saving ? 0.5 : 1 }}
              onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Start Tracking 🌸"}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════════════
function CycleCalendar({ dashboard, allPeriods = [] }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const yr = viewMonth.getFullYear(), mo = viewMonth.getMonth();
  const firstDay = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const daysInMo = new Date(yr, mo + 1, 0).getDate();

  const isPeriod = (day) => {
    const d = new Date(yr, mo, day); d.setHours(12,0,0,0);
    for (const c of allPeriods) {
      const s = new Date(c.startDate); s.setHours(0,0,0,0);
      const e = new Date(c.endDate);   e.setHours(23,59,59,999);
      if (d >= s && d <= e) return true;
    }
    if (dashboard) {
      for (const p of (dashboard.predictions || [])) {
        const ps = new Date(p.startDate); ps.setHours(0,0,0,0);
        const pe = new Date(p.endDate);   pe.setHours(23,59,59,999);
        if (d >= ps && d <= pe) return "predicted";
      }
    }
    return false;
  };

  const isOvulation = (day) => {
    if (!dashboard?.ovulation) return false;
    return new Date(yr, mo, day).toDateString() === new Date(dashboard.ovulation.date).toDateString();
  };

  const isToday = (day) => new Date(yr, mo, day).toDateString() === today.toDateString();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMo; d++) cells.push(d);
  const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const getCellStyle = (day) => {
    if (!day) return { ...S.calCell, opacity:0, pointerEvents:"none" };
    const p = isPeriod(day);
    const ovul = isOvulation(day);
    const tod  = isToday(day);
    if (p === true)      return { ...S.calCell, background:"linear-gradient(135deg,#e8637a,#c0392b)", color:"white", fontWeight:700, boxShadow:"0 4px 12px rgba(232,99,122,0.4)" };
    if (p === "predicted") return { ...S.calCell, background:"#fff0f4", color:"#e8637a", border:"2px dashed #f4a7b9" };
    if (ovul)            return { ...S.calCell, background:"linear-gradient(135deg,#d4f5e5,#a8dbc9)", color:"#1a6b42", fontWeight:700, border:"2px solid #4caf78" };
    if (tod)             return { ...S.calCell, background:"linear-gradient(135deg,#f0e8fb,#f8eef6)", color:"#6b3fa0", fontWeight:700, boxShadow:"0 0 0 2px #9b72cf" };
    return S.calCell;
  };

  return (
    <div style={{ width:"100%" }}>
      <div style={S.calNav}>
        <button style={S.calArrow} onClick={() => setViewMonth(new Date(yr, mo-1, 1))}>‹</button>
        <span style={S.calMonth}>{viewMonth.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</span>
        <button style={S.calArrow} onClick={() => setViewMonth(new Date(yr, mo+1, 1))}>›</button>
      </div>
      <div style={S.calGrid}>
        {DAY_NAMES.map(d => <div key={d} style={S.calDayname}>{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} style={getCellStyle(day)}>{day || ""}</div>
        ))}
      </div>
      <div style={S.calLegend}>
        <span><span style={{ ...S.legDot, background:"linear-gradient(135deg,#e8637a,#c0392b)" }}/> Period</span>
        <span><span style={{ ...S.legDot, background:"#fff0f4", border:"2px dashed #f4a7b9" }}/> Predicted</span>
        <span><span style={{ ...S.legDot, background:"linear-gradient(135deg,#d4f5e5,#a8dbc9)", border:"2px solid #4caf78" }}/> Ovulation</span>
        <span><span style={{ ...S.legDot, background:"#f0e8fb", border:"2px solid #9b72cf" }}/> Today</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  CYCLE RING
// ═══════════════════════════════════════════════════
function CycleRing({ dashboard }) {
  if (!dashboard) return null;
  const cl    = dashboard.profile?.cycleLength || 28;
  const day   = dashboard.currentCycle?.dayOfCycle || 1;
  const phase = dashboard.currentCycle?.phase || "Luteal";
  const color = dashboard.currentCycle?.phaseColor || "#9b72cf";
  const days  = dashboard.nextPeriod?.daysUntil ?? 0;
  const r = 100, cx = 115, cy = 115, circ = 2 * Math.PI * r;
  const dash  = circ * Math.min(1, (day-1)/cl);

  return (
    <div style={{ position:"relative", display:"flex", justifyContent:"center", filter:"drop-shadow(0 8px 24px rgba(155,114,207,0.25))" }}>
      <svg width="230" height="230" viewBox="0 0 230 230">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0d6dc" strokeWidth="15"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="15"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition:"stroke-dasharray 1s ease" }}/>
        <text x={cx} y={cy-22} textAnchor="middle" style={{ fontSize:11, fill:"#b08898", fontFamily:"Plus Jakarta Sans, sans-serif" }}>
          {days > 0 ? "period in" : days === 0 ? "period" : "days late"}
        </text>
        <text x={cx} y={cy+16} textAnchor="middle" style={{ fontSize:38, fontWeight:700, fill:color, fontFamily:"Cormorant Garamond, serif" }}>
          {Math.abs(days)}
        </text>
        <text x={cx} y={cy+33} textAnchor="middle" style={{ fontSize:11, fill:"#b08898", fontFamily:"Plus Jakarta Sans, sans-serif" }}>days</text>
        <text x={cx} y={cy+52} textAnchor="middle" style={{ fontSize:12, fill:color, fontFamily:"Plus Jakarta Sans, sans-serif", fontWeight:500 }}>
          {phase} phase
        </text>
      </svg>
      <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", background:color, color:"white", borderRadius:20, padding:"4px 16px", fontSize:"0.72rem", fontWeight:600, whiteSpace:"nowrap", letterSpacing:"0.5px" }}>
        Day {day}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SETTINGS MODAL
// ═══════════════════════════════════════════════════
function SettingsModal({ profile, onClose, onSave }) {
  const [cl, setCl]       = useState(profile?.cycleLength || 28);
  const [pl, setPl]       = useState(profile?.periodLength || 5);
  const [ls, setLs]       = useState(profile?.lastStartDate ? profile.lastStartDate.split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState("");

  const handleSave = async () => {
    if (!ls) return setMsg("Please enter a start date.");
    setSaving(true);
    try {
      const res = await setupCycleProfile(TEMP_USER_ID, cl, pl, ls);
      if (res.data.success) { setMsg("✅ Saved!"); setTimeout(() => onSave(), 800); }
      else setMsg("❌ Failed to save.");
    } catch { setMsg("❌ Connection error."); }
    setSaving(false);
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <span style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.2rem", color:"#1e0a2e", fontWeight:600 }}>⚙️ Edit Cycle Profile</span>
          <button style={S.modalClose} onClick={onClose}>✕</button>
        </div>

        {[["Cycle length", cl, setCl, 15, 60], ["Period length", pl, setPl, 1, 10]].map(([label, val, setter, min, max]) => (
          <div key={label} style={{ marginBottom:18 }}>
            <div style={{ fontSize:"0.78rem", fontWeight:600, color:"#7a5490", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.8px" }}>{label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <button style={S.obBtn} onClick={() => setter(v => Math.max(min, v-1))}>−</button>
              <div style={{ textAlign:"center", minWidth:64 }}>
                <span style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"2.5rem", fontWeight:700, color:"#6b3fa0" }}>{val}</span>
                <span style={{ display:"block", fontSize:"0.75rem", color:"#b89ec4" }}>days</span>
              </div>
              <button style={S.obBtn} onClick={() => setter(v => Math.min(max, v+1))}>+</button>
            </div>
          </div>
        ))}

        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:"0.78rem", fontWeight:600, color:"#7a5490", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.8px" }}>Last period start date</div>
          <input type="date" style={S.obDateInput} value={ls}
            onChange={e => setLs(e.target.value)}
            max={new Date().toISOString().split("T")[0]}/>
        </div>

        {msg && <div style={{ ...S.obError, ...(msg.startsWith("✅") ? { background:"#edfbf3", color:"#1a6b42", borderLeftColor:"#4caf78" } : {}) }}>{msg}</div>}
        <button style={{ ...S.btn, width:"100%", justifyContent:"center", marginTop:12, opacity: saving ? 0.5 : 1 }}
          onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function MenstrualTracker() {
  const [screen, setScreen]               = useState("loading");
  const [activeTab, setActiveTab]         = useState("home");
  const [dashboard, setDashboard]         = useState(null);
  const [showSettings, setShowSettings]   = useState(false);
  const [allPeriods, setAllPeriods]       = useState([]);
  const [selSymptoms, setSelSymptoms]     = useState([]);
  const [todaySymptoms, setTodaySymptoms] = useState([]);
  const [symptomMsg, setSymptomMsg]       = useState(null);
  const [symHistory, setSymHistory]       = useState([]);

  const today = new Date().toISOString().split("T")[0];

  const loadDashboard = useCallback(async () => {
    try {
      const [dashRes, periodsRes] = await Promise.all([
        getDashboard(TEMP_USER_ID),
        getAllPeriods(TEMP_USER_ID),
      ]);
      if (dashRes.data.success)    setDashboard(dashRes.data);
      if (periodsRes.data.success) setAllPeriods(periodsRes.data.cycles);
      setScreen("app");
    } catch { setScreen("app"); }
  }, []);

  const loadTodaySymptoms = useCallback(async () => {
    try {
      const res = await getSymptomsForDate(TEMP_USER_ID, today);
      if (res.data.success) setTodaySymptoms(res.data.symptoms.map(s => s.symptom));
    } catch {}
  }, [today]);

  const loadSymptomHistory = useCallback(async () => {
    try {
      const res = await getSymptomHistory(TEMP_USER_ID);
      if (res.data.success) setSymHistory(res.data.symptoms);
    } catch {}
  }, []);

  const handleUndoPeriod = async () => {
    if (!window.confirm("Remove your last logged period?")) return;
    try {
        const res = await undoLastPeriod(TEMP_USER_ID);
        if (res.data.success) await loadDashboard();
        else alert("Nothing to undo.");
    } catch { alert("❌ Failed. Try again."); }
   };

  useEffect(() => {
    getCycleProfile(TEMP_USER_ID)
      .then(r => { if (r.data.success) loadDashboard(); else setScreen("onboarding"); })
      .catch(() => setScreen("onboarding"));
  }, [loadDashboard]);

  useEffect(() => {
    if (screen === "app") { loadTodaySymptoms(); loadSymptomHistory(); }
  }, [screen, loadTodaySymptoms, loadSymptomHistory]);

  const toggleSymptom = (label) =>
    setSelSymptoms(p => p.includes(label) ? p.filter(s => s !== label) : [...p, label]);

  const handleLogSymptoms = async () => {
    setSymptomMsg(null);
    if (!selSymptoms.length) return setSymptomMsg({ type:"error", text:"Select at least one symptom." });
    if (!dashboard?.currentCycle) return;
    try {
      const profileRes = await getCycleProfile(TEMP_USER_ID);
      const cycleId = profileRes.data.cycle._id;
      for (const s of selSymptoms) await addSymptom(cycleId, s, today);
      setSymptomMsg({ type:"success", text:`✅ ${selSymptoms.length} symptom(s) logged for today!` });
      setTodaySymptoms(prev => [...new Set([...prev, ...selSymptoms])]);
      setSelSymptoms([]);
      loadSymptomHistory();
    } catch { setSymptomMsg({ type:"error", text:"❌ Failed. Try again." }); }
  };

  const handleLogTodayPeriod = async () => {
    try {
      const cycleLength  = dashboard?.profile?.cycleLength  || 28;
      const periodLength = dashboard?.profile?.periodLength || 5;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + periodLength - 1);
      const res = await logTodayPeriod(TEMP_USER_ID, today, endDate.toISOString().split("T")[0], cycleLength, periodLength);
      if (res.data.success) await loadDashboard();
    } catch { alert("❌ Failed to log. Check if server is running."); }
  };

  const TABS = [
    { key:"home",    icon:"🏠", label:"Today"    },
    { key:"symptom", icon:"💊", label:"Symptoms" },
    { key:"cycle",   icon:"📅", label:"Calendar" },
    { key:"tips",    icon:"💡", label:"Tips"     },
    { key:"profile", icon:"⚙️", label:"Profile"  },
  ];

  // ── LOADING ──
  if (screen === "loading") {
    return (
      <div style={S.loadingPage}>
        <style>{`@keyframes floatPulse{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.1) translateY(-8px)}}`}</style>
        <div style={{ fontSize:"4rem", animation:"floatPulse 2s ease-in-out infinite", filter:"drop-shadow(0 0 20px rgba(244,167,185,0.6))" }}>🌸</div>
        <p style={{ color:"rgba(255,255,255,0.8)", fontSize:"1rem", fontWeight:300, letterSpacing:"2px", textTransform:"uppercase" }}>Loading your cycle...</p>
      </div>
    );
  }

  // ── ONBOARDING ──
  if (screen === "onboarding") {
    return <Onboarding onComplete={() => { setScreen("loading"); loadDashboard(); }}/>;
  }

  // ── MAIN APP ──
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{transform:translateY(80px);opacity:0} to{transform:translateY(0);opacity:1} }
        .flo-card-anim { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .sym-chip:hover { border-color:#9b72cf!important;color:#6b3fa0!important;background:#f0e8fb!important;transform:translateY(-1px); }
        .cal-arrow-btn:hover { background:#9b72cf!important;color:white!important;transform:scale(1.05); }
        .phase-card-item:hover { transform:translateY(-3px);box-shadow:0 8px 32px rgba(107,63,160,0.14)!important; }
        .bottom-tab-item { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:none;border:none;cursor:pointer;color:#b89ec4;transition:all 0.2s;padding:8px 0;position:relative; }
        .bottom-tab-item.active { color:#6b3fa0; }
        .bottom-tab-item::before { content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:0;height:3px;background:linear-gradient(90deg,#9b72cf,#e8637a);border-radius:0 0 3px 3px;transition:width 0.3s ease; }
        .bottom-tab-item.active::before { width:32px; }
        .bottom-tab-item.active .tab-icon { transform:scale(1.2) translateY(-2px);filter:drop-shadow(0 2px 6px rgba(155,114,207,0.4)); }
        .flo-main-btn:hover { transform:translateY(-3px)!important;box-shadow:0 12px 32px rgba(155,114,207,0.45)!important; }
        .flo-outline-btn:hover { background:#f0e8fb!important; }
        .modal-close-btn:hover { background:#9b72cf!important;color:white!important; }
        .settings-btn:hover { background:rgba(255,255,255,0.25)!important;transform:rotate(45deg); }
        .profile-row-item { display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(155,114,207,0.08);font-size:0.88rem;color:#7a5490; }
        .profile-row-item:last-of-type { border-bottom:none; }
      `}</style>

      {/* HEADER */}
      <div style={S.header}>
        <div>
          <div style={S.logo}>🌸 SheVerse</div>
          <div style={S.subtitle}>Health Tracker</div>
        </div>
        <button className="settings-btn" style={S.settingsBtn} onClick={() => setShowSettings(true)}>⚙️</button>
      </div>

      {showSettings && (
        <SettingsModal profile={dashboard?.profile} onClose={() => setShowSettings(false)}
          onSave={() => { setShowSettings(false); loadDashboard(); }}/>
      )}

      <div style={S.content}>

        {/* ──HOME── */}
       {activeTab === "home" && dashboard && (
  <div>
    {dashboard.notifications?.slice(0,1).map((n,i) => (
      <div key={i} style={S.topNotif}>{n}</div>
    ))}

    {/* CARD 1 — Full width ring card */}
    <div className="flo-card-anim" style={{ ...S.card, ...S.centerCard, marginTop:16, padding:40 }}>
      <CycleRing dashboard={dashboard}/>
      <div style={{ display:"flex", gap:16, width:"100%", marginTop:24 }}>
        <div style={{ ...S.dateChip, background:"#fde8ec", color:"#e8637a" }}>
          <span style={S.chipLabel}>Next period</span>
          <span style={{ ...S.chipVal, fontSize:"1.1rem" }}>{fmtShort(dashboard.nextPeriod?.startDate)}</span>
        </div>
        <div style={{ ...S.dateChip, background:"#eaf8f0", color:"#4caf78" }}>
          <span style={S.chipLabel}>Ovulation</span>
          <span style={{ ...S.chipVal, fontSize:"1.1rem" }}>{fmtShort(dashboard.ovulation?.date)}</span>
        </div>
        <div style={{ ...S.dateChip, background:"#f0eafa", color:"#9b72cf" }}>
          <span style={S.chipLabel}>Cycle day</span>
          <span style={{ ...S.chipVal, fontSize:"1.1rem" }}>Day {dashboard.currentCycle?.dayOfCycle}</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:16, width:"100%", marginTop:20 }}>
        <button className="flo-main-btn"
          style={{ ...S.btn, flex:1, justifyContent:"center", marginTop:0, background:"linear-gradient(120deg,#e8637a,#c0392b)", fontSize:"1.05rem", padding:"16px" }}
          onClick={handleLogTodayPeriod}>
          🩸 Log Period Today
        </button>
        <button onClick={handleUndoPeriod}
          style={{ display:"flex", flex:1, alignItems:"center", justifyContent:"center", gap:8, background:"transparent", color:"#e8637a", border:"2px solid #e8637a", borderRadius:14, padding:"16px", fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"1.05rem", fontWeight:600, cursor:"pointer", marginTop:0 }}>
          ↩️ Undo Last Period
        </button>
      </div>
    </div>

    {/* BOTTOM ROW — 2 cards side by side */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>

      {/* CARD 2 — Symptoms */}
      <div className="flo-card-anim" style={{ ...S.card, padding:28 }}>
        <div style={S.cardTitle}>💊 How are you feeling today?</div>
        {todaySymptoms.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
            {todaySymptoms.map(s => {
              const info = SYMPTOM_LIST.find(x => x.label === s);
              return <span key={s} style={{ ...S.tag, background:info?.color+"22", color:info?.color }}>{info?.emoji} {s}</span>;
            })}
          </div>
        )}
        <button className="flo-outline-btn" style={{ ...S.btnOutline, width:"100%", justifyContent:"center", marginTop:8, fontSize:"1rem" }}
          onClick={() => setActiveTab("symptom")}>
          {todaySymptoms.length > 0 ? "➕ Add More Symptoms" : "📝 Log Symptoms"}
        </button>
      </div>

      {/* CARD 3 — Upcoming Periods */}
      <div className="flo-card-anim" style={{ ...S.card, padding:28 }}>
        <div style={S.cardTitle}>📅 Upcoming Periods</div>
        {dashboard.predictions?.map((p,i) => (
          <div key={i} style={{ ...S.upcomingRow, padding:"10px 0" }}>
            <div style={S.upIcon}>🩸</div>
            <div>
              <div style={{ fontSize:"0.95rem", fontWeight:600, color:"#1e0a2e" }}>{fmt(p.startDate)} → {fmt(p.endDate)}</div>
              <div style={{ fontSize:"0.78rem", color:"#b89ec4", marginTop:2 }}>{Math.round((new Date(p.startDate)-new Date())/86400000)} days from now</div>
            </div>
          </div>
        ))}
      </div>

    </div>

    {/* Health status */}
    <div className="flo-card-anim" style={{
      ...S.card, marginTop:16, display:"flex", alignItems:"center", gap:16, padding:"20px 28px",
      ...(dashboard.healthStatus === "Normal"
        ? { background:"linear-gradient(135deg,#edfbf3,#d4f5e5)", border:"1px solid rgba(76,175,120,0.2)" }
        : { background:"linear-gradient(135deg,#fff0f4,#fde8ec)", border:"1px solid rgba(232,99,122,0.2)" })
    }}>
      <div style={{ width:52, height:52, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem", background:"rgba(255,255,255,0.6)", flexShrink:0 }}>
        {dashboard.healthStatus === "Normal" ? "✅" : "⚠️"}
      </div>
      <div>
        <div style={{ fontWeight:700, fontSize:"1rem", color:"#1e0a2e" }}>{dashboard.healthStatus} Cycle</div>
        <div style={{ fontSize:"0.85rem", color:"#7a5490", marginTop:4, lineHeight:1.5 }}>{dashboard.healthMsg}</div>
      </div>
    </div>
  </div>
)}
    

        {/* ── SYMPTOMS ── */}
        {activeTab === "symptom" && (
          <div>
            <div className="flo-card-anim" style={S.card}>
              <div style={S.cardTitle}>💊 Log Today's Symptoms</div>
              <div style={{ fontSize:"1.0rem", color:"#b89ec4", marginBottom:14, background:"#f0e8fb", padding:"8px 14px", borderRadius:10, display:"inline-block", fontWeight:500 }}>
                📅 {fmt(today)}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                {SYMPTOM_LIST.map(s => {
                  const logged = todaySymptoms.includes(s.label);
                  const sel    = selSymptoms.includes(s.label);
                  return (
                    <button key={s.label} className="sym-chip"
                      style={{
                        border: `1.5px solid ${sel||logged ? s.color : "rgba(155,114,207,0.2)"}`,
                        background: sel ? s.color : logged ? s.color+"22" : "#fdf8ff",
                        color: sel ? "#fff" : logged ? s.color : "#7a5490",
                        borderRadius:16, padding:"18px 24px",
                        fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"1rem",
                        cursor: logged ? "default" : "pointer",
                        display:"flex", alignItems:"center", gap:10, fontWeight:500,
                        boxShadow: sel ? `0 4px 16px ${s.color}44` : "0 2px 8px rgba(155,114,207,0.08)",
                        transition:"all 0.2s",
                        minWidth:"160px",
                       }}
                      onClick={() => !logged && toggleSymptom(s.label)}>
                      {s.emoji} {s.label} {logged ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
              {selSymptoms.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                  {selSymptoms.map(s => {
                    const info = SYMPTOM_LIST.find(x => x.label === s);
                    return <span key={s} style={{ ...S.tag, background:info?.color+"22", color:info?.color }}>{info?.emoji} {s}</span>;
                  })}
                </div>
              )}
              <button className="flo-main-btn" style={S.btn} onClick={handleLogSymptoms}>📝 Save Symptoms</button>
              {symptomMsg && (
                <div style={{ ...S.alert, ...(symptomMsg.type === "success" ? S.alertSuccess : S.alertError) }}>{symptomMsg.text}</div>
              )}
            </div>

            {symHistory.length > 0 && (
              <div className="flo-card-anim" style={{ ...S.card, marginTop:12 }}>
                <div style={S.cardTitle}>📋 Symptom History</div>
                {[...new Set(symHistory.map(s => s.date?.split("T")[0]))].slice(0,7).map(date => (
                  <div key={date} style={{ marginBottom:14 }}>
                    <div style={{ fontSize:"0.74rem", fontWeight:600, color:"#7a5490", marginBottom:8 }}>📅 {fmt(date)}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {symHistory.filter(s => s.date?.split("T")[0] === date).map((s,i) => {
                        const info = SYMPTOM_LIST.find(x => x.label === s.symptom);
                        return <span key={i} style={{ ...S.tag, background:info?.color+"22", color:info?.color }}>{info?.emoji} {s.symptom}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CALENDAR ── */}
        {activeTab === "cycle" && (
          <div>
            <div className="flo-card-anim" style={S.card}>
              <div style={S.cardTitle}>📆 Cycle Calendar</div>
              <CycleCalendar dashboard={dashboard} allPeriods={allPeriods}/>
            </div>
            <div className="flo-card-anim" style={{ ...S.card, marginTop:12 }}>
              <div style={S.cardTitle}>🔄 Cycle Phases</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {PHASES.map(p => (
                  <div key={p.name} className="phase-card-item"
                    style={{ borderRadius:14, padding:34, background:p.bg, borderLeft:`4px solid ${p.color}`, border:`1px solid ${dashboard?.currentCycle?.phase===p.name ? "rgba(155,114,207,0.3)" : "transparent"}`, cursor:"default" }}>
                    <div style={{ fontSize:"1.4rem", marginBottom:6 }}>{p.icon}</div>
                    <div style={{ fontSize:"1.2rem", fontWeight:700, color:p.color, marginBottom:3 }}>{p.name}</div>
                    <div style={{ fontSize:"0.88rem", color:"#b89ec4", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>{p.days}</div>
                    <div style={{ fontSize:"1.0rem", lineHeight:1.5, opacity:0.8 }}>{p.desc}</div>
                    {dashboard?.currentCycle?.phase === p.name && (
                      <div style={{ fontSize:"0.68rem", fontWeight:700, marginTop:8, color:p.color }}>← You are here</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TIPS ── */}
        {activeTab === "tips" && (
        <div>
            {/* Notifications row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22, marginBottom:16 }}>
            {dashboard?.notifications?.map((n,i) => (
                <div key={i} style={{ ...S.notifRow, fontSize:"1.0rem" }}>{n}</div>
            ))}
            </div>

            <div className="flo-card-anim" style={{ ...S.card, padding:28 }}>
            <div style={S.cardTitle}>💡 Health Tips by Phase</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:36 }}>
                {PHASES.map(p => (
                <div key={p.name}
                    style={{ borderRadius:16, padding:"50px 30px", background:p.bg, borderLeft:`4px solid ${p.color}` }}>
                    <div style={{ fontWeight:700, fontSize:"1.5rem", color:p.color, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:"1.4rem" }}>{p.icon}</span> {p.name}
                    {dashboard?.currentCycle?.phase === p.name && (
                        <span style={{ background:`linear-gradient(135deg,${p.color},#e8637a)`, color:"white", fontSize:"0.65rem", borderRadius:10, padding:"3px 10px", fontWeight:600 }}>Current</span>
                    )}
                    </div>
                    <ul style={{ paddingLeft:18, color:"#1e0a2e", fontSize:"1.0rem", lineHeight:2.0, margin:0 }}>
                    {p.name === "Menstrual" && <><li>Apply a heat pad to reduce cramps</li><li>Stay hydrated with warm water & herbal teas</li><li>Eat iron-rich foods: spinach, lentils, red meat</li><li>Light yoga or gentle walks are ideal</li></>}
                    {p.name === "Follicular" && <><li>Great time for new projects — energy is rising!</li><li>Focus on strength training & cardio</li><li>Eat fermented foods for gut health</li><li>Try learning something new this week</li></>}
                    {p.name === "Ovulation" && <><li>Peak energy — push yourself in workouts!</li><li>Great for social events & presentations</li><li>Eat antioxidant-rich foods: berries, leafy greens</li><li>Confidence is at its highest — use it!</li></>}
                    {p.name === "Luteal" && <><li>Practice self-compassion — PMS is real</li><li>Reduce sugar & alcohol to ease mood swings</li><li>Magnesium-rich foods: nuts, dark chocolate</li><li>Prioritise sleep — aim for 8 hours</li></>}
                    </ul>
                </div>
                ))}
            </div>
            </div>
        </div>
        )}

        {/* ── PROFILE ── */}
        {activeTab === "profile" && dashboard && (
          <div>
            <div className="flo-card-anim" style={S.card}>
              <div style={S.cardTitle}>👤 My Cycle Profile</div>
              {[
                ["Cycle length",       `${dashboard.profile?.cycleLength} days`],
                ["Period length",      `${dashboard.profile?.periodLength} days`],
                ["Last period started", fmt(dashboard.profile?.lastStartDate)],
                ["Current day of cycle", `Day ${dashboard.currentCycle?.dayOfCycle}`],
              ].map(([label, value]) => (
                <div key={label} className="profile-row-item">
                  <span>{label}</span><strong style={{ color:"#1e0a2e" }}>{value}</strong>
                </div>
              ))}
              <div className="profile-row-item">
                <span>Current phase</span>
                <strong style={{ color: dashboard.currentCycle?.phaseColor }}>{dashboard.currentCycle?.phase}</strong>
              </div>
              <div className="profile-row-item">
                <span>Health status</span>
                <strong style={{ color: dashboard.healthStatus === "Normal" ? "#4caf78" : "#e8637a" }}>{dashboard.healthStatus}</strong>
              </div>
              <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(155,114,207,0.2),transparent)", margin:"14px 0" }}/>
              <button className="flo-main-btn" style={{ ...S.btn, width:"100%", justifyContent:"center" }} onClick={() => setShowSettings(true)}>
                ✏️ Edit Cycle Profile
              </button>
            </div>

            <div className="flo-card-anim" style={{ ...S.card, marginTop:12 }}>
              <div style={S.cardTitle}>📅 Next 3 Predicted Periods</div>
              {dashboard.predictions?.map((p,i) => (
                <div key={i} style={S.upcomingRow}>
                  <div style={S.upIcon}>🩸</div>
                  <div>
                    <div style={{ fontSize:"0.9rem", fontWeight:600, color:"#1e0a2e" }}>{fmt(p.startDate)} → {fmt(p.endDate)}</div>
                    <div style={{ fontSize:"0.74rem", color:"#b89ec4", marginTop:2 }}>{Math.round((new Date(p.startDate)-new Date())/86400000)} days from now</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <div style={S.bottomNav}>
        {TABS.map(t => (
          <button key={t.key} className={`bottom-tab-item ${activeTab===t.key?"active":""}`}
            onClick={() => setActiveTab(t.key)}>
            <span className="tab-icon" style={{ fontSize:"1.3rem", transition:"all 0.2s", display:"block" }}>{t.icon}</span>
            <span style={{ fontSize:"0.6rem", fontFamily:"Plus Jakarta Sans, sans-serif", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════
const S = {
  // Loading
  loadingPage:  { minHeight:"100vh", width:"100vw", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(160deg,#1e0a2e 0%,#6b3fa0 50%,#e8637a 100%)", gap:20 },

  // Onboarding
  onboardPage:  { minHeight:"100vh", width:"100vw", background:"linear-gradient(160deg,#1e0a2e 0%,#6b3fa0 45%,#c084b0 75%,#f4a7b9 100%)", display:"flex", flexDirection:"column", alignItems:"center", padding:0, fontFamily:"Plus Jakarta Sans, sans-serif" },
  onboardTop:   { display:"flex", flexDirection:"column", alignItems:"center", padding:"70px 32px 36px", color:"white", width:"100%" },
  onboardTitle: { fontFamily:"Cormorant Garamond, serif", fontSize:"2.4rem", fontWeight:700, textAlign:"center", lineHeight:1.2, letterSpacing:"-0.5px" },
  onboardSub:   { fontSize:"0.9rem", opacity:0.78, marginTop:10, fontWeight:300, letterSpacing:"0.5px" },
  onboardCard:  { background:"white", borderRadius:"32px 32px 0 0", width:"100%", maxWidth:600, flex:1, padding:"36px 32px 50px", animation:"slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both" },
  obQ:          { fontFamily:"Cormorant Garamond, serif", fontSize:"1.6rem", color:"#1e0a2e", marginBottom:8, fontWeight:600, lineHeight:1.3 },
  obHint:       { fontSize:"0.82rem", color:"#b89ec4", marginBottom:32, lineHeight:1.6 },
  obSliderRow:  { display:"flex", alignItems:"center", justifyContent:"center", gap:24, marginBottom:24 },
  obBtn:        { width:48, height:48, borderRadius:"50%", background:"#fce8ef", border:"2px solid #f4a7b9", color:"#e8637a", fontSize:"1.5rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", lineHeight:1, fontWeight:300 },
  obValueBox:   { textAlign:"center", minWidth:80 },
  obValue:      { display:"block", fontFamily:"Cormorant Garamond, serif", fontSize:"3.5rem", fontWeight:700, background:"linear-gradient(135deg,#6b3fa0,#e8637a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", lineHeight:1 },
  obUnit:       { display:"block", fontSize:"0.75rem", color:"#b89ec4", marginTop:4, textTransform:"uppercase", letterSpacing:"1px" },
  obRange:      { width:"100%", marginBottom:8, accentColor:"#9b72cf", height:4 },
  obRangeLabels:{ display:"flex", justifyContent:"space-between", fontSize:"0.7rem", color:"#b89ec4", marginBottom:32 },
  obNextBtn:    { width:"100%", background:"linear-gradient(135deg,#9b72cf 0%,#e8637a 100%)", color:"white", border:"none", borderRadius:16, padding:16, fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"1rem", fontWeight:600, cursor:"pointer", transition:"all 0.25s", boxShadow:"0 6px 24px rgba(232,99,122,0.35)", letterSpacing:"0.3px" },
  obBackBtn:    { flex:1, background:"#f0e8fb", color:"#6b3fa0", border:"none", borderRadius:16, padding:16, fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"0.95rem", fontWeight:500, cursor:"pointer", transition:"all 0.2s" },
  obDateInput:  { width:"100%", border:"2px solid #edd5f0", borderRadius:14, padding:"14px 18px", fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"0.95rem", color:"#1e0a2e", outline:"none", marginBottom:20, transition:"all 0.2s", background:"#fdf8ff" },
  obSummary:    { background:"linear-gradient(135deg,#fff0f4,#f0e8fb)", borderRadius:14, padding:"16px 18px", marginBottom:20, border:"1px solid rgba(155,114,207,0.15)" },
  obSumRow:     { display:"flex", justifyContent:"space-between", fontSize:"0.86rem", color:"#7a5490", padding:"5px 0" },
  obError:      { background:"#fff0f4", color:"#9b2335", borderRadius:10, padding:"12px 16px", fontSize:"0.84rem", marginBottom:16, borderLeft:"4px solid #e8637a" },

  // Main app
  page:         { minHeight:"100vh", width:"100vw", background:"#faf5ff", fontFamily:"Plus Jakarta Sans, sans-serif", color:"#1e0a2e", position:"relative" },
  header:       { position:"sticky", top:0, zIndex:100, background:"linear-gradient(135deg,#6b3fa0 0%,#c084b0 50%,#e8637a 100%)", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", boxShadow:"0 4px 24px rgba(107,63,160,0.3)" },
  logo:         { color:"white", fontFamily:"Cormorant Garamond, serif", fontSize:"1.35rem", fontWeight:700, letterSpacing:"0.3px" },
  subtitle:     { color:"rgba(255,255,255,0.65)", fontSize:"0.65rem", fontWeight:300, letterSpacing:"1.5px", textTransform:"uppercase" },
  settingsBtn:  { background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.3)", color:"white", borderRadius:12, width:40, height:40, fontSize:"1.1rem", cursor:"pointer", transition:"all 0.2s" },
  topNotif:     { background:"linear-gradient(135deg,rgba(107,63,160,0.95),rgba(232,99,122,0.95))", color:"white", padding:"12px 24px", fontSize:"0.82rem", lineHeight:1.5, textAlign:"center" },
  content:      { padding:"20px 20px calc(72px + 20px)", maxWidth:1200, margin:"0 auto" },

  // Cards
  card:         { background:"white", borderRadius:24, padding:24, boxShadow:"0 2px 12px rgba(107,63,160,0.10)", border:"1px solid rgba(155,114,207,0.08)", position:"relative", overflow:"hidden" },
  centerCard:   { display:"flex", flexDirection:"column", alignItems:"center" },
  cardTitle:    { fontFamily:"Cormorant Garamond, serif", fontSize:"1.15rem", color:"#6b3fa0", marginBottom:16, fontWeight:600, letterSpacing:"0.2px", display:"flex", alignItems:"center", gap:8 },

  // Date chips
  dateChip:     { flex:1, borderRadius:14, padding:"12px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 },
  chipLabel:    { fontSize:"0.6rem", fontWeight:600, opacity:0.65, textTransform:"uppercase", letterSpacing:"0.8px" },
  chipVal:      { fontSize:"0.85rem", fontWeight:700, letterSpacing:"-0.2px" },

  // Upcoming
  upcomingRow:  { display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:"1px solid rgba(155,114,207,0.08)" },
  upIcon:       { width:36, height:36, background:"#fce8ef", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 },

  // Tags
  tag:          { display:"inline-flex", alignItems:"center", gap:4, borderRadius:20, padding:"5px 12px", fontSize:"0.76rem", fontWeight:600 },

  // Buttons
  btn:          { display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#9b72cf 0%,#e8637a 100%)", color:"white", border:"none", borderRadius:14, padding:"13px 26px", fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"0.92rem", fontWeight:600, cursor:"pointer", transition:"all 0.25s", boxShadow:"0 6px 24px rgba(232,99,122,0.35)", marginTop:8, letterSpacing:"0.2px" },
  btnOutline:   { display:"inline-flex", alignItems:"center", gap:8, background:"transparent", color:"#6b3fa0", border:"2px solid #9b72cf", borderRadius:14, padding:"13px 26px", fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"0.92rem", fontWeight:600, cursor:"pointer", transition:"all 0.25s", marginTop:8 },

  // Alerts
  alert:        { padding:"12px 16px", borderRadius:10, fontSize:"0.84rem", marginTop:12, lineHeight:1.5, fontWeight:500 },
  alertSuccess: { background:"linear-gradient(135deg,#edfbf3,#d4f5e5)", color:"#1a6b42", border:"1px solid rgba(76,175,120,0.2)" },
  alertError:   { background:"linear-gradient(135deg,#fff0f4,#fde8ec)", color:"#9b2335", border:"1px solid rgba(232,99,122,0.2)" },

  // Notifications
  notifRow:     { background:"linear-gradient(135deg,#fff0f4,#f0e8fb)", borderRadius:14, padding:"13px 16px", fontSize:"0.86rem", color:"#1e0a2e", border:"1px solid rgba(155,114,207,0.15)", lineHeight:1.6 },

  // Calendar
  calNav:       { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  calMonth:     { fontFamily:"Cormorant Garamond, serif", fontWeight:700, fontSize:"2.2rem", color:"#1e0a2e", letterSpacing:"0.3px" },
  calArrow:     { background:"#f0e8fb", border:"none", width:34, height:34, borderRadius:10, fontSize:"1.2rem", color:"#6b3fa0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" },
  calGrid:      { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:30 },
  calDayname:   { textAlign:"center", fontSize:"1.5rem", fontWeight:700, color:"#b89ec4", padding:"6px 0", textTransform:"uppercase", letterSpacing:"0.8px" },
  calCell:      { aspectRatio:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.0rem", fontWeight:500, borderRadius:"50%", color:"#1e0a2e", transition:"all 0.15s", cursor:"pointer", maxWidth:46, maxHeight:46, margin:"0 auto" },
  calLegend:    { display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center", marginTop:16, fontSize:"1.5rem", color:"#7a5490", paddingTop:12, borderTop:"1px solid rgba(155,114,207,0.1)" },
  legDot:       { display:"inline-block", width:10, height:10, borderRadius:"50%", marginRight:5, verticalAlign:"middle" },

  // Modal
  modalOverlay: { position:"fixed", inset:0, zIndex:200, background:"rgba(30,10,46,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(6px)" },
  modalBox:     { background:"white", borderRadius:"28px 28px 0 0", width:"100%", maxWidth:600, padding:"28px 28px 48px", animation:"slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both" },
  modalClose:   { background:"#f0e8fb", border:"none", borderRadius:"50%", width:32, height:32, fontSize:"0.9rem", cursor:"pointer", color:"#6b3fa0", fontWeight:700, transition:"all 0.2s" },

  // Bottom nav
  bottomNav:    { position:"fixed", bottom:0, left:0, right:0, height:72, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderTop:"1px solid rgba(155,114,207,0.12)", display:"flex", zIndex:100, boxShadow:"0 -8px 32px rgba(107,63,160,0.10)" },
};
