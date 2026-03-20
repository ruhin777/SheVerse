import React, { useState, useEffect, useCallback } from "react";
import "./MenstrualTracker.css";
import {
  setupCycleProfile,
  getCycleProfile,
  getDashboard,
  addSymptom,
  getSymptomsForDate,
  getSymptomHistory,
  logTodayPeriod,
  getAllPeriods, 
} from "./services/api";

// ─── TEMP: hardcoded user ID until login is ready ───────────
// When your login system is ready, replace this with the actual
// logged-in user's _id from your auth context/state
const TEMP_USER_ID = "69bc19440a2698ee36014471";
// ────────────────────────────────────────────────────────────

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
//  ONBOARDING SCREEN
// ═══════════════════════════════════════════════════
function Onboarding({ onComplete }) {
  const [step, setStep]             = useState(1); // 1, 2, 3
  const [cycleLength, setCycleLength]   = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lastStart, setLastStart]       = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  

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
    <div className="onboard-page">
      <div className="onboard-top">
        <div className="onboard-flower">🌸</div>
        <h1 className="onboard-title">Welcome to<br/>SheVerse Health</h1>
        <p className="onboard-sub">Let's set up your cycle tracker</p>
        <div className="onboard-steps">
          {[1,2,3].map(i => <div key={i} className={`ob-dot ${step >= i ? "active" : ""}`}/>)}
        </div>
      </div>

      <div className="onboard-card">
        {step === 1 && (
          <>
            <div className="ob-q">How long is your average cycle?</div>
            <div className="ob-hint">From first day of period to first day of next period</div>
            <div className="ob-slider-row">
              <button className="ob-minus" onClick={() => setCycleLength(v => Math.max(15, v - 1))}>−</button>
              <div className="ob-value-box">
                <span className="ob-value">{cycleLength}</span>
                <span className="ob-unit">days</span>
              </div>
              <button className="ob-plus" onClick={() => setCycleLength(v => Math.min(60, v + 1))}>+</button>
            </div>
            <input type="range" min="15" max="60" value={cycleLength}
              onChange={e => setCycleLength(+e.target.value)} className="ob-range"/>
            <div className="ob-range-labels"><span>15</span><span>Normal: 28</span><span>60</span></div>
            <button className="ob-next-btn" onClick={() => setStep(2)}>Continue →</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="ob-q">How many days does your period last?</div>
            <div className="ob-hint">Average number of bleeding days per cycle</div>
            <div className="ob-slider-row">
              <button className="ob-minus" onClick={() => setPeriodLength(v => Math.max(1, v - 1))}>−</button>
              <div className="ob-value-box">
                <span className="ob-value">{periodLength}</span>
                <span className="ob-unit">days</span>
              </div>
              <button className="ob-plus" onClick={() => setPeriodLength(v => Math.min(10, v + 1))}>+</button>
            </div>
            <input type="range" min="1" max="10" value={periodLength}
              onChange={e => setPeriodLength(+e.target.value)} className="ob-range"/>
            <div className="ob-range-labels"><span>1</span><span>Normal: 5</span><span>10</span></div>
            <div className="ob-btn-row">
              <button className="ob-back-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="ob-next-btn" onClick={() => setStep(3)}>Continue →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="ob-q">When did your last period start?</div>
            <div className="ob-hint">We'll use this to calculate your next period</div>
            <input type="date" className="ob-date-input" value={lastStart}
              onChange={e => setLastStart(e.target.value)}
              max={new Date().toISOString().split("T")[0]}/>
            {lastStart && (
              <div className="ob-summary">
                <div className="ob-sum-row"><span>Cycle length</span><strong>{cycleLength} days</strong></div>
                <div className="ob-sum-row"><span>Period length</span><strong>{periodLength} days</strong></div>
                <div className="ob-sum-row"><span>Last start</span><strong>{fmt(lastStart)}</strong></div>
              </div>
            )}
            {error && <div className="ob-error">{error}</div>}
            <div className="ob-btn-row">
              <button className="ob-back-btn" onClick={() => setStep(2)}>← Back</button>
              <button className="ob-next-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Start Tracking 🌸"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  CALENDAR COMPONENT
// ═══════════════════════════════════════════════════
function CycleCalendar({ dashboard, allPeriods = [] }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const yr = viewMonth.getFullYear(), mo = viewMonth.getMonth();
  const firstDay = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const daysInMo = new Date(yr, mo + 1, 0).getDate();

  const isPeriod = (day) => {
  const d = new Date(yr, mo, day);
  d.setHours(12, 0, 0, 0);

  // Check ALL historical periods
  for (const c of allPeriods) {
    const s = new Date(c.startDate); s.setHours(0,0,0,0);
    const e = new Date(c.endDate);   e.setHours(23,59,59,999);
    if (d >= s && d <= e) return true;
  }

  // Check predicted future periods
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

  return (
    <div className="flo-calendar">
      <div className="cal-nav">
        <button className="cal-arrow" onClick={() => setViewMonth(new Date(yr, mo - 1, 1))}>‹</button>
        <span className="cal-month">{viewMonth.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</span>
        <button className="cal-arrow" onClick={() => setViewMonth(new Date(yr, mo + 1, 1))}>›</button>
      </div>
      <div className="cal-grid">
        {DAY_NAMES.map(d => <div key={d} className="cal-dayname">{d}</div>)}
        {cells.map((day, i) => {
          const p = day ? isPeriod(day) : false;
          return (
            <div key={i} className={[
              "cal-cell",
              !day ? "empty" : "",
              day && isToday(day) ? "today" : "",
              p === true ? "period" : "",
              p === "predicted" ? "predicted" : "",
              day && isOvulation(day) ? "ovulation" : "",
            ].join(" ")}>
              {day || ""}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        <span><span className="leg-dot ld-period"/>Period</span>
        <span><span className="leg-dot ld-predicted"/>Predicted</span>
        <span><span className="leg-dot ld-ovulation"/>Ovulation</span>
        <span><span className="leg-dot ld-today"/>Today</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  CYCLE RING
// ═══════════════════════════════════════════════════
function CycleRing({ dashboard }) {
  if (!dashboard) return null;
  const { currentCycle, nextPeriod, cycleLength } = dashboard.profile
    ? { ...dashboard, cycleLength: dashboard.profile.cycleLength }
    : { ...dashboard, cycleLength: 28 };

  const cl     = dashboard.profile?.cycleLength || 28;
  const day    = dashboard.currentCycle?.dayOfCycle || 1;
  const phase  = dashboard.currentCycle?.phase || "Luteal";
  const color  = dashboard.currentCycle?.phaseColor || "#9b72cf";
  const days   = dashboard.nextPeriod?.daysUntil ?? 0;

  const r = 74, cx = 92, cy = 92, circ = 2 * Math.PI * r;
  const progress = Math.min(1, (day - 1) / cl);
  const dash = circ * progress;

  return (
    <div className="ring-outer">
      <svg width="184" height="184" viewBox="0 0 184 184">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0d6dc" strokeWidth="15"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="15"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 1s ease" }}/>
        <text x={cx} y={cy - 22} textAnchor="middle"
          style={{ fontSize: 11, fill: "#b08898", fontFamily: "DM Sans, sans-serif" }}>
          {days > 0 ? "period in" : days === 0 ? "period" : "days late"}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle"
          style={{ fontSize: 38, fontWeight: 700, fill: color, fontFamily: "Playfair Display, serif" }}>
          {Math.abs(days)}
        </text>
        <text x={cx} y={cy + 33} textAnchor="middle"
          style={{ fontSize: 11, fill: "#b08898", fontFamily: "DM Sans, sans-serif" }}>days</text>
        <text x={cx} y={cy + 52} textAnchor="middle"
          style={{ fontSize: 12, fill: color, fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>
          {phase} phase
        </text>
      </svg>
      <div className="ring-day-badge" style={{ background: color }}>Day {day}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SETTINGS MODAL
// ═══════════════════════════════════════════════════
function SettingsModal({ profile, onClose, onSave }) {
  const [cl, setCl]     = useState(profile?.cycleLength || 28);
  const [pl, setPl]     = useState(profile?.periodLength || 5);
  const [ls, setLs]     = useState(profile?.lastStartDate ? profile.lastStartDate.split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]   = useState("");

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚙️ Edit Cycle Profile</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-field">
          <label>Cycle length</label>
          <div className="ob-slider-row sm">
            <button className="ob-minus" onClick={() => setCl(v => Math.max(15, v-1))}>−</button>
            <div className="ob-value-box sm"><span className="ob-value">{cl}</span><span className="ob-unit">days</span></div>
            <button className="ob-plus" onClick={() => setCl(v => Math.min(60, v+1))}>+</button>
          </div>
        </div>

        <div className="modal-field">
          <label>Period length</label>
          <div className="ob-slider-row sm">
            <button className="ob-minus" onClick={() => setPl(v => Math.max(1, v-1))}>−</button>
            <div className="ob-value-box sm"><span className="ob-value">{pl}</span><span className="ob-unit">days</span></div>
            <button className="ob-plus" onClick={() => setPl(v => Math.min(10, v+1))}>+</button>
          </div>
        </div>

        <div className="modal-field">
          <label>Last period start date</label>
          <input type="date" className="ob-date-input" value={ls}
            onChange={e => setLs(e.target.value)}
            max={new Date().toISOString().split("T")[0]}/>
        </div>

        {msg && <div className={`ob-error ${msg.startsWith("✅") ? "success" : ""}`}>{msg}</div>}
        <button className="flo-btn" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
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
  const [screen, setScreen]             = useState("loading"); // loading | onboarding | app
  const [activeTab, setActiveTab]       = useState("home");
  const [dashboard, setDashboard]       = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const [allPeriods, setAllPeriods] = useState([]);

  // Symptoms
  const [selSymptoms, setSelSymptoms]   = useState([]);
  const [todaySymptoms, setTodaySymptoms] = useState([]);
  const [symptomMsg, setSymptomMsg]     = useState(null);
  const [symHistory, setSymHistory]     = useState([]);

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
  } catch {
    setScreen("app");
  }
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

  useEffect(() => {
    // Check if user already has a profile
    getCycleProfile(TEMP_USER_ID)
      .then(r => {
        if (r.data.success) loadDashboard();
        else setScreen("onboarding");
      })
      .catch(() => setScreen("onboarding"));
  }, [loadDashboard]);

  useEffect(() => {
    if (screen === "app") {
      loadTodaySymptoms();
      loadSymptomHistory();
    }
  }, [screen, loadTodaySymptoms, loadSymptomHistory]);

  const toggleSymptom = (label) =>
    setSelSymptoms(p => p.includes(label) ? p.filter(s => s !== label) : [...p, label]);

  const handleLogSymptoms = async () => {
    setSymptomMsg(null);
    if (!selSymptoms.length) return setSymptomMsg({ type: "error", text: "Select at least one symptom." });
    if (!dashboard?.currentCycle) return;
    try {
      // Get cycle id from profile
      const profileRes = await getCycleProfile(TEMP_USER_ID);
      const cycleId = profileRes.data.cycle._id;
      for (const s of selSymptoms) await addSymptom(cycleId, s, today);
      setSymptomMsg({ type: "success", text: `✅ ${selSymptoms.length} symptom(s) logged for today!` });
      setTodaySymptoms(prev => [...new Set([...prev, ...selSymptoms])]);
      setSelSymptoms([]);
      loadSymptomHistory();
    } catch { setSymptomMsg({ type: "error", text: "❌ Failed. Try again." }); }
  };

  const handleLogTodayPeriod = async () => {
  try {
    const cycleLength  = dashboard?.profile?.cycleLength  || 28;
    const periodLength = dashboard?.profile?.periodLength || 5;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + periodLength - 1);
    const endDateStr = endDate.toISOString().split("T")[0];

    const res = await logTodayPeriod(
      TEMP_USER_ID,
      today,
      endDateStr,
      cycleLength,
      periodLength
    );

    if (res.data.success) {
      await loadDashboard();
    }
  } catch {
    alert("❌ Failed to log. Check if server is running.");
  }
};

  const TABS = [
    { key: "home",    icon: "🏠", label: "Today"    },
    { key: "symptom", icon: "💊", label: "Symptoms" },
    { key: "cycle",   icon: "📅", label: "Calendar" },
    { key: "tips",    icon: "💡", label: "Tips"     },
    { key: "profile", icon: "⚙️", label: "Profile"  },
  ];

  // ── LOADING ──────────────────────────────────────
  if (screen === "loading") {
    return (
      <div className="flo-loading">
        <div className="loading-flower">🌸</div>
        <p>Loading your cycle...</p>
      </div>
    );
  }

  // ── ONBOARDING ───────────────────────────────────
  if (screen === "onboarding") {
    return <Onboarding onComplete={() => { setScreen("loading"); loadDashboard(); }} />;
  }

  // ── MAIN APP ─────────────────────────────────────
  return (
    <div className="flo-page">

      {/* HEADER */}
      <div className="flo-header">
        <div>
          <div className="flo-logo">🌸 SheVerse</div>
          <div className="flo-subtitle">Health Tracker</div>
        </div>
        <button className="flo-settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal
          profile={dashboard?.profile}
          onClose={() => setShowSettings(false)}
          onSave={() => { setShowSettings(false); loadDashboard(); }}
        />
      )}

      <div className="flo-content">

        {/* ═══ HOME TAB ═══ */}
        {activeTab === "home" && dashboard && (
          <div>
            {/* Notifications */}
            {dashboard.notifications?.slice(0,1).map((n,i) => (
              <div key={i} className="top-notif">{n}</div>
            ))}

            {/* Ring + next period info */}
            <div className="flo-card center-card" style={{ marginTop: 0 }}>
              <CycleRing dashboard={dashboard} />
              <div className="home-dates-row">
                <div className="home-date-chip" style={{ background: "#fde8ec", color: "#e8637a" }}>
                  <span className="hdc-label">Next period</span>
                  <span className="hdc-val">{fmtShort(dashboard.nextPeriod?.startDate)}</span>
                </div>
                <div className="home-date-chip" style={{ background: "#eaf8f0", color: "#4caf78" }}>
                  <span className="hdc-label">Ovulation</span>
                  <span className="hdc-val">{fmtShort(dashboard.ovulation?.date)}</span>
                </div>
                <div className="home-date-chip" style={{ background: "#f0eafa", color: "#9b72cf" }}>
                  <span className="hdc-label">Cycle day</span>
                  <span className="hdc-val">Day {dashboard.currentCycle?.dayOfCycle}</span>
                </div>
              </div>
            </div>

            {/* Ovulation info */}
            {dashboard.ovulation?.daysUntil >= 0 && dashboard.ovulation?.daysUntil <= 5 && (
              <div className="flo-card ovul-card" style={{ marginTop: 12 }}>
                <div className="ovul-header">✨ Ovulation in {dashboard.ovulation.daysUntil} day(s)</div>
                <div className="ovul-sub">Fertility window is approaching. Your pregnancy chances may be higher.</div>
              </div>
            )}

            {/* Today's symptoms quick log */}
            <div className="flo-card" style={{ marginTop: 12 }}>
              <div className="card-title">💊 How are you feeling today?</div>
              {todaySymptoms.length > 0 && (
                <div className="today-sym-row">
                  {todaySymptoms.map(s => {
                    const info = SYMPTOM_LIST.find(x => x.label === s);
                    return <span key={s} className="sel-tag" style={{ background: info?.color+"22", color: info?.color }}>{info?.emoji} {s}</span>;
                  })}
                </div>
              )}
              <button className="flo-btn flo-btn-outline" style={{ marginTop: 8 }}
                onClick={() => setActiveTab("symptom")}>
                {todaySymptoms.length > 0 ? "➕ Add More" : "📝 Log Symptoms"}
              </button>
              <button className="flo-btn" style={{ width:"100%", justifyContent:"center", marginTop:8, background:"linear-gradient(120deg,#e8637a,#c0392b)" }}
                onClick={handleLogTodayPeriod}>
                🩸 Log Period Today
              </button>
            </div>

            {/* Upcoming periods */}
            <div className="flo-card" style={{ marginTop: 12 }}>
              <div className="card-title">📅 Upcoming Periods</div>
              {dashboard.predictions?.map((p, i) => (
                <div key={i} className="upcoming-row">
                  <span className="up-icon">🩸</span>
                  <div>
                    <div className="up-dates">{fmt(p.startDate)} → {fmt(p.endDate)}</div>
                    <div className="up-meta">{Math.round((new Date(p.startDate)-new Date())/86400000)} days from now</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Health status */}
            <div className={`flo-card health-card ${dashboard.healthStatus}`} style={{ marginTop: 12 }}>
              <div className="health-icon">{dashboard.healthStatus === "Normal" ? "✅" : "⚠️"}</div>
              <div>
                <div className="health-title">{dashboard.healthStatus} Cycle</div>
                <div className="health-msg">{dashboard.healthMsg}</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SYMPTOMS TAB ═══ */}
        {activeTab === "symptom" && (
          <div>
            <div className="flo-card">
              <div className="card-title">💊 Log Today's Symptoms</div>
              <div className="sym-date-label">📅 {fmt(today)}</div>
              <div className="symptom-chips">
                {SYMPTOM_LIST.map(s => {
                  const logged = todaySymptoms.includes(s.label);
                  const sel    = selSymptoms.includes(s.label);
                  return (
                    <button key={s.label}
                      className={`symptom-chip ${sel ? "selected" : ""} ${logged ? "already" : ""}`}
                      style={sel ? { background: s.color, borderColor: s.color, color: "#fff" }
                           : logged ? { background: s.color+"22", borderColor: s.color, color: s.color } : {}}
                      onClick={() => !logged && toggleSymptom(s.label)}
                    >
                      {s.emoji} {s.label} {logged ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
              {selSymptoms.length > 0 && (
                <div className="selected-symptoms">
                  {selSymptoms.map(s => {
                    const info = SYMPTOM_LIST.find(x => x.label === s);
                    return <span key={s} className="sel-tag" style={{ background: info?.color+"22", color: info?.color }}>{info?.emoji} {s}</span>;
                  })}
                </div>
              )}
              <button className="flo-btn" onClick={handleLogSymptoms}>📝 Save Symptoms</button>
              {symptomMsg && <div className={`flo-alert ${symptomMsg.type}`}>{symptomMsg.text}</div>}
            </div>

            {/* History */}
            {symHistory.length > 0 && (
              <div className="flo-card" style={{ marginTop: 12 }}>
                <div className="card-title">📋 Symptom History</div>
                {[...new Set(symHistory.map(s => s.date?.split("T")[0]))].slice(0,7).map(date => (
                  <div key={date} className="symptom-date-group">
                    <div className="symptom-date-label">📅 {fmt(date)}</div>
                    <div className="symptom-tags-row">
                      {symHistory.filter(s => s.date?.split("T")[0] === date).map((s, i) => {
                        const info = SYMPTOM_LIST.find(x => x.label === s.symptom);
                        return <span key={i} className="sel-tag" style={{ background: info?.color+"22", color: info?.color }}>{info?.emoji} {s.symptom}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CALENDAR TAB ═══ */}
        {activeTab === "cycle" && (
          <div>
            <div className="flo-card">
              <div className="card-title">📆 Cycle Calendar</div>
              <CycleCalendar dashboard={dashboard} allPeriods={allPeriods} />
            </div>
            <div className="flo-card" style={{ marginTop: 12 }}>
              <div className="card-title">🔄 Cycle Phases</div>
              <div className="phases-grid">
                {PHASES.map(p => (
                  <div key={p.name} className={`phase-card ${dashboard?.currentCycle?.phase === p.name ? "active-phase" : ""}`}
                    style={{ background: p.bg, borderLeft: `4px solid ${p.color}` }}>
                    <div className="phase-icon">{p.icon}</div>
                    <div className="phase-name" style={{ color: p.color }}>{p.name}</div>
                    <div className="phase-days">{p.days}</div>
                    <div className="phase-desc">{p.desc}</div>
                    {dashboard?.currentCycle?.phase === p.name && (
                      <div className="you-are-here" style={{ color: p.color }}>← You are here</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TIPS TAB ═══ */}
        {activeTab === "tips" && (
          <div>
            {dashboard?.notifications?.map((n, i) => (
              <div key={i} className="notif-row" style={{ marginBottom: 8 }}>{n}</div>
            ))}
            <div className="flo-card" style={{ marginTop: 12 }}>
              <div className="card-title">💡 Health Tips by Phase</div>
              {PHASES.map(p => (
                <div key={p.name} className="tip-section">
                  <div className="tip-phase-header" style={{ color: p.color }}>
                    {p.icon} {p.name}
                    {dashboard?.currentCycle?.phase === p.name && <span className="current-phase-tag">Current</span>}
                  </div>
                  <ul className="tip-list">
                    {p.name === "Menstrual" && <>
                      <li>Apply a heat pad to reduce cramps</li>
                      <li>Stay hydrated with warm water & herbal teas</li>
                      <li>Eat iron-rich foods: spinach, lentils, red meat</li>
                      <li>Light yoga or gentle walks are ideal</li>
                    </>}
                    {p.name === "Follicular" && <>
                      <li>Great time for new projects — energy is rising!</li>
                      <li>Focus on strength training & cardio</li>
                      <li>Eat fermented foods for gut health</li>
                    </>}
                    {p.name === "Ovulation" && <>
                      <li>Peak energy — push yourself in workouts!</li>
                      <li>Great for social events & presentations</li>
                      <li>Eat antioxidant-rich foods: berries, leafy greens</li>
                    </>}
                    {p.name === "Luteal" && <>
                      <li>Practice self-compassion — PMS is real</li>
                      <li>Reduce sugar & alcohol to ease mood swings</li>
                      <li>Magnesium-rich foods: nuts, dark chocolate</li>
                      <li>Prioritise sleep — aim for 8 hours</li>
                    </>}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PROFILE TAB ═══ */}
        {activeTab === "profile" && dashboard && (
          <div>
            <div className="flo-card">
              <div className="card-title">👤 My Cycle Profile</div>
              <div className="profile-row"><span>Cycle length</span><strong>{dashboard.profile?.cycleLength} days</strong></div>
              <div className="profile-row"><span>Period length</span><strong>{dashboard.profile?.periodLength} days</strong></div>
              <div className="profile-row"><span>Last period started</span><strong>{fmt(dashboard.profile?.lastStartDate)}</strong></div>
              <div className="profile-row"><span>Current day of cycle</span><strong>Day {dashboard.currentCycle?.dayOfCycle}</strong></div>
              <div className="profile-row"><span>Current phase</span>
                <strong style={{ color: dashboard.currentCycle?.phaseColor }}>{dashboard.currentCycle?.phase}</strong>
              </div>
              <div className="profile-row"><span>Health status</span>
                <strong style={{ color: dashboard.healthStatus === "Normal" ? "#4caf78" : "#e8637a" }}>
                  {dashboard.healthStatus}
                </strong>
              </div>
              <div className="flo-divider"/>
              <button className="flo-btn" style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setShowSettings(true)}>
                ✏️ Edit Cycle Profile
              </button>
            </div>

            <div className="flo-card" style={{ marginTop: 12 }}>
              <div className="card-title">📅 Next 3 Predicted Periods</div>
              {dashboard.predictions?.map((p, i) => (
                <div key={i} className="upcoming-row">
                  <span className="up-icon">🩸</span>
                  <div>
                    <div className="up-dates">{fmt(p.startDate)} → {fmt(p.endDate)}</div>
                    <div className="up-meta">{Math.round((new Date(p.startDate)-new Date())/86400000)} days from now</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <div className="flo-bottom-nav">
        {TABS.map(t => (
          <button key={t.key} className={`bottom-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}>
            <span className="bottom-icon">{t.icon}</span>
            <span className="bottom-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
