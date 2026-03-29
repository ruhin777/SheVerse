import { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";

const INCIDENT_TYPES = [
  "Verbal harassment / catcalling",
  "Physical harassment or assault",
  "Stalking or being followed",
  "Unwanted touching",
  "Online harassment or threats",
  "Unsafe area / poor lighting",
  "Suspicious behavior nearby",
  "Eve teasing",
  "Workplace harassment",
  "Other",
];

export default function IncidentReportPage() {
  const token = localStorage.getItem("token");

  const getNow = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const emptyForm = {
    description: "",
    location: "",
    dateTime: getNow(),
    anonymous: false,
    selectedTypes: [], // ✅ now an array for multiple selection
  };

  const [form, setForm]           = useState(emptyForm);
  const [status, setStatus]       = useState(null);
  const [message, setMessage]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg]   = useState(false);
  const [tab, setTab]             = useState("form");
  const [editingId, setEditingId] = useState(null);
  const suggRef = useRef(null);

  // ✅ Fix ESLint warning: wrap in useCallback
  const fetchMyReports = useCallback(async () => {
    if (!token) return;
    try {
      const res = await API.get("/api/incidents/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyReports(res.data);
    } catch (_) {}
  }, [token]);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  useEffect(() => {
    const handler = (e) => {
      if (suggRef.current && !suggRef.current.contains(e.target)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ✅ Toggle a chip — adds or removes from selectedTypes array
  const toggleType = (type) => {
    setForm((f) => {
      const already = f.selectedTypes.includes(type);
      return {
        ...f,
        selectedTypes: already
          ? f.selectedTypes.filter((t) => t !== type)
          : [...f.selectedTypes, type],
      };
    });
  };

  const handleLocationChange = async (val) => {
    setForm((f) => ({ ...f, location: val }));
    if (val.length < 2) { setSuggestions([]); setShowSugg(false); return; }
    try {
      const res = await API.get(`/api/incidents/places?q=${val}`);
      setSuggestions(res.data);
      setShowSugg(res.data.length > 0);
    } catch (_) { setSuggestions([]); }
  };

  const pickSuggestion = (place) => {
    setForm((f) => ({ ...f, location: `${place.name}, ${place.city}` }));
    setShowSugg(false);
  };

  const handleSubmit = async () => {
    setStatus(null);

    if (!form.location.trim()) {
      setStatus("error");
      setMessage("Please enter a location.");
      return;
    }
    if (!form.dateTime) {
      setStatus("error");
      setMessage("Please select a date and time.");
      return;
    }
    // ✅ Need at least one type selected OR a description written
    if (form.selectedTypes.length === 0 && !form.description.trim()) {
      setStatus("error");
      setMessage("Please select at least one incident type or describe what happened.");
      return;
    }

    // ✅ Build incidentType string from selected chips
    const incidentType = form.selectedTypes.join(", ");

    // ✅ If description is empty, use the selected types as the description
    const description = form.description.trim()
      ? form.description.trim()
      : incidentType;

    setLoading(true);
    try {
      const payload = {
        description,
        location: form.location.trim(),
        dateTime: form.dateTime,
        anonymous: form.anonymous,
        incidentType,
      };

      if (editingId) {
        await API.put(`/api/incidents/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus("success");
        setMessage("Your report has been updated successfully.");
        setEditingId(null);
      } else {
        await API.post("/api/incidents", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus("success");
        setMessage("Report submitted. Thank you for keeping the community safe.");
      }

      setForm(emptyForm);
      fetchMyReports();
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (r) => {
    const dt = new Date(r.dateTime);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());

    // ✅ Parse stored incidentType string back into array
    const selectedTypes = r.incidentType
      ? r.incidentType.split(", ").filter(Boolean)
      : [];

    // ✅ If description matches the incidentType exactly, clear it so the box shows empty
    const description = r.description === r.incidentType ? "" : (r.description || "");

    setForm({
      description,
      location: r.location || "",
      dateTime: dt.toISOString().slice(0, 16),
      anonymous: r.anonymous || false,
      selectedTypes,
    });
    setEditingId(r._id);
    setTab("form");
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setStatus(null);
  };

  const fmt = (d) => new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={S.wrapper}>

      <style>{`
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(30%) sepia(80%) saturate(500%) hue-rotate(240deg);
          cursor: pointer;
        }
        input[type="datetime-local"] {
          color-scheme: light;
          accent-color: #7c3aed;
        }
      `}</style>

      <div style={S.header}>
        <p style={S.sub}>SAFETY — REPORT AN INCIDENT</p>
        <h1 style={S.title}>{editingId ? "Edit Report" : "Report Incident"}</h1>
        <div style={S.divider} />
        <p style={S.desc}>
          Help us map unsafe areas and protect the community. Your identity is always your choice.
        </p>
      </div>

      <div style={S.tabBar}>
        <button
          style={{ ...S.tabBtn, ...(tab === "form" ? S.tabActive : {}) }}
          onClick={() => setTab("form")}
        >
          📋 {editingId ? "Edit Report" : "Submit Report"}
        </button>
        <button
          style={{ ...S.tabBtn, ...(tab === "history" ? S.tabActive : {}) }}
          onClick={() => { setTab("history"); fetchMyReports(); }}
        >
          🕘 My Reports ({myReports.length})
        </button>
      </div>

      {tab === "form" && (
        <div style={S.card}>

          {/* Anonymous toggle */}
          <div style={S.anonymousRow}>
            <div style={S.anonymousLeft}>
              <span style={S.anonymousIcon}>{form.anonymous ? "🎭" : "👤"}</span>
              <div>
                <p style={S.anonymousLabel}>
                  {form.anonymous ? "Anonymous Report" : "Report with Identity"}
                </p>
                <p style={S.anonymousNote}>
                  {form.anonymous
                    ? "Your name will not be attached to this report."
                    : "Your identity will be recorded internally."}
                </p>
              </div>
            </div>
            <button
              style={{
                ...S.toggleBtn,
                background: form.anonymous ? "linear-gradient(135deg,#7c3aed,#c084c4)" : "transparent",
                color: form.anonymous ? "#fff" : "#9d4edd",
                border: form.anonymous ? "none" : "1.5px solid #e9d5ff",
              }}
              onClick={() => setForm((f) => ({ ...f, anonymous: !f.anonymous }))}
            >
              {form.anonymous ? "On" : "Off"}
            </button>
          </div>

          <div style={S.sep} />

          {/* ✅ Multi-select incident type chips */}
          <div style={S.fieldGroup}>
            <label style={S.label}>
              TYPE OF INCIDENT
              <span style={S.optionalTag}> (select one or more — no description needed)</span>
            </label>
            <div style={S.chipsWrap}>
              {INCIDENT_TYPES.map((type) => {
                const selected = form.selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    style={{
                      ...S.chip,
                      background: selected ? "linear-gradient(135deg,#7c3aed,#c084c4)" : "#fdf4ff",
                      color: selected ? "#fff" : "#7c3aed",
                      border: selected ? "none" : "1.5px solid #e9d5ff",
                    }}
                    onClick={() => toggleType(type)}
                  >
                    {selected ? "✓ " : ""}{type}
                  </button>
                );
              })}
            </div>
            {form.selectedTypes.length > 0 && (
              <p style={S.selectedNote}>
                ✅ Selected: {form.selectedTypes.join(" · ")}
              </p>
            )}
          </div>

          {/* Description — optional if types are selected */}
          <div style={S.fieldGroup}>
            <label style={S.label}>
              ADDITIONAL DETAILS
              <span style={S.optionalTag}>
                {form.selectedTypes.length > 0
                  ? " (optional — types above are enough)"
                  : " (required if no type selected above)"}
              </span>
            </label>
            <textarea
              style={S.textarea}
              rows={4}
              placeholder={
                form.selectedTypes.length > 0
                  ? "Add any extra details you'd like to share… (optional)"
                  : "Describe what happened if you haven't selected a type above…"
              }
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Location */}
          <div style={S.fieldGroup} ref={suggRef}>
            <label style={S.label}>LOCATION <span style={S.req}>*</span></label>
            <input
              style={S.input}
              placeholder="Type a place name or address…"
              value={form.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            />
            {showSugg && (
              <div style={S.suggBox}>
                {suggestions.map((p) => (
                  <div
                    key={p._id}
                    style={S.suggItem}
                    onMouseDown={() => pickSuggestion(p)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3e8ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={S.suggName}>📍 {p.name}</span>
                    <span style={S.suggCity}>{p.city}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={S.hint}>Start typing to see known locations, or enter any address.</p>
          </div>

          {/* Date & Time */}
          <div style={S.fieldGroup}>
            <label style={S.label}>DATE & TIME OF INCIDENT <span style={S.req}>*</span></label>
            <input
              style={S.input}
              type="datetime-local"
              value={form.dateTime}
              onChange={(e) => setForm((f) => ({ ...f, dateTime: e.target.value }))}
            />
          </div>

          {status && (
            <div style={{
              ...S.statusBox,
              background: status === "success" ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${status === "success" ? "#bbf7d0" : "#fecdd3"}`,
              color: status === "success" ? "#166534" : "#9f1239",
            }}>
              <span style={{ fontSize: 18 }}>{status === "success" ? "✅" : "⚠️"}</span>
              {message}
            </div>
          )}

          <div style={S.btnRow}>
            <button
              style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? "Submitting…"
                : editingId
                ? "💾 Save Changes"
                : form.anonymous
                ? "🎭 Submit Anonymously"
                : "📤 Submit Report"}
            </button>
            {editingId && (
              <button style={S.cancelBtn} onClick={handleCancel}>Cancel</button>
            )}
          </div>

          <div style={S.infoRow}>
            <InfoPill icon="🔒" text="All reports are stored securely." />
            <InfoPill icon="🗺️" text="Reports help identify unsafe areas." />
            <InfoPill icon="🤝" text="You protect women by reporting." />
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={S.historyWrap}>
          {myReports.length === 0 ? (
            <div style={S.emptyBox}>
              <p style={S.emptyIcon}>📂</p>
              <p style={S.emptyText}>You haven't submitted any reports yet.</p>
            </div>
          ) : (
            myReports.map((r) => (
              <div key={r._id} style={S.reportCard}>
                <div style={S.reportTop}>
                  <span style={{
                    ...S.badge,
                    background: r.anonymous ? "#f3e8ff" : "#fce7f3",
                    color: r.anonymous ? "#7c3aed" : "#be185d",
                  }}>
                    {r.anonymous ? "🎭 Anonymous" : "👤 With Identity"}
                  </span>
                  <span style={S.reportDate}>{fmt(r.dateTime)}</span>
                </div>

                {/* ✅ Show each selected type as its own badge */}
                {r.incidentType && (
                  <div style={S.typeBadgesRow}>
                    {r.incidentType.split(", ").filter(Boolean).map((t) => (
                      <span key={t} style={S.typeBadge}>{t}</span>
                    ))}
                  </div>
                )}

                <p style={S.reportLocation}>📍 {r.location}</p>

                {/* ✅ Only show description if it's different from the incidentType */}
                {r.description && r.description !== r.incidentType && (
                  <p style={S.reportDesc}>{r.description}</p>
                )}

                <button style={S.editReportBtn} onClick={() => handleEdit(r)}>
                  ✏️ Edit Report
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function InfoPill({ icon, text }) {
  return (
    <div style={pill.wrap}>
      <span style={pill.icon}>{icon}</span>
      <span style={pill.text}>{text}</span>
    </div>
  );
}

const pill = {
  wrap: {
    display: "flex", alignItems: "flex-start", gap: 8,
    background: "#fdf4ff", border: "1px solid #f3e8ff",
    borderRadius: 12, padding: "10px 14px", flex: 1, minWidth: 160,
  },
  icon: { fontSize: 16, flexShrink: 0 },
  text: { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.6 },
};

const S = {
  wrapper: { maxWidth: 780, margin: "0 auto", padding: "40px 24px 60px", fontFamily: "'Georgia', serif" },

  header: { textAlign: "center", marginBottom: 32 },
  sub: { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 400, color: "#3b0764", margin: "0 0 14px" },
  divider: { width: 48, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  desc: { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" },

  tabBar: { display: "flex", gap: 8, background: "#f3e8ff", borderRadius: 14, padding: 5, marginBottom: 28 },
  tabBtn: {
    flex: 1, padding: "11px", border: "none", borderRadius: 10,
    background: "transparent", cursor: "pointer", fontSize: 13,
    fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 0.5, transition: "all 0.25s",
  },
  tabActive: {
    background: "#ffffff", color: "#7c3aed",
    boxShadow: "0 2px 10px rgba(124,58,237,0.13)", fontWeight: 600,
  },

  card: {
    background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "32px 36px",
    boxShadow: "0 8px 40px rgba(157,107,157,0.13)", border: "1px solid #f3e8ff",
  },

  anonymousRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#fdf4ff", borderRadius: 14, padding: "16px 20px",
    border: "1px solid #f3e8ff", marginBottom: 20, gap: 12, flexWrap: "wrap",
  },
  anonymousLeft: { display: "flex", alignItems: "center", gap: 14 },
  anonymousIcon: { fontSize: 26 },
  anonymousLabel: { margin: 0, fontSize: 14, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600 },
  anonymousNote: { margin: "4px 0 0", fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" },
  toggleBtn: {
    padding: "8px 22px", borderRadius: 20, cursor: "pointer",
    fontSize: 13, fontFamily: "sans-serif", fontWeight: 600,
    transition: "all 0.25s", flexShrink: 0,
  },

  sep: { height: 1, background: "#f3e8ff", margin: "4px 0 24px" },

  fieldGroup: { marginBottom: 22, position: "relative" },
  label: { display: "block", fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 10 },
  req: { color: "#e879a8" },
  optionalTag: { fontSize: 10, color: "#c084c4", letterSpacing: 0.5, fontStyle: "italic", textTransform: "none", letterSpacing: 0 },

  chipsWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: "8px 14px", borderRadius: 20, cursor: "pointer",
    fontSize: 12, fontFamily: "sans-serif", letterSpacing: 0.3,
    transition: "all 0.2s", fontWeight: 500,
  },
  selectedNote: {
    marginTop: 10, fontSize: 12, color: "#7c3aed",
    fontFamily: "sans-serif", fontStyle: "italic",
  },

  input: {
    width: "100%", padding: "13px 16px", border: "1.5px solid #e9d5ff",
    borderRadius: 12, fontSize: 14, fontFamily: "sans-serif", color: "#3b0764",
    background: "#fff", outline: "none", boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "13px 16px", border: "1.5px solid #e9d5ff",
    borderRadius: 12, fontSize: 14, fontFamily: "sans-serif", color: "#3b0764",
    background: "#fff", outline: "none", resize: "vertical",
    boxSizing: "border-box", lineHeight: 1.7,
  },
  hint: { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", margin: "6px 0 0" },

  suggBox: {
    position: "absolute", top: "100%", left: 0, right: 0,
    background: "#fff", border: "1px solid #e9d5ff",
    borderRadius: "0 0 12px 12px",
    boxShadow: "0 10px 30px rgba(157,107,157,0.15)", zIndex: 50,
    maxHeight: 200, overflowY: "auto",
  },
  suggItem: {
    padding: "10px 16px", cursor: "pointer",
    display: "flex", justifyContent: "space-between",
    alignItems: "center", transition: "background 0.15s",
  },
  suggName: { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif" },
  suggCity: { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif" },

  statusBox: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "14px 18px", borderRadius: 12, fontSize: 13,
    fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: 20,
  },

  btnRow: { display: "flex", gap: 10, marginBottom: 24 },
  submitBtn: {
    flex: 1, padding: "15px",
    background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
    fontSize: 14, fontFamily: "sans-serif", letterSpacing: 1.5, transition: "opacity 0.2s",
  },
  cancelBtn: {
    padding: "15px 22px", background: "transparent",
    color: "#9d4edd", border: "1.5px solid #e9d5ff",
    borderRadius: 12, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif",
  },

  infoRow: { display: "flex", gap: 10, flexWrap: "wrap" },

  historyWrap: { display: "flex", flexDirection: "column", gap: 14 },
  emptyBox: { textAlign: "center", padding: "60px 20px" },
  emptyIcon: { fontSize: 40, margin: "0 0 12px" },
  emptyText: { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14 },

  reportCard: {
    background: "#fff", borderRadius: 16, padding: "20px 24px",
    border: "1px solid #f3e8ff", boxShadow: "0 4px 20px rgba(157,107,157,0.09)",
  },
  reportTop: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8,
  },
  badge: { fontSize: 12, fontFamily: "sans-serif", padding: "4px 12px", borderRadius: 20, fontWeight: 600 },
  reportDate: { fontSize: 12, color: "#c084c4", fontFamily: "sans-serif" },
  typeBadgesRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  typeBadge: {
    display: "inline-block", fontSize: 11, fontFamily: "sans-serif",
    padding: "4px 12px", borderRadius: 20, background: "#f3e8ff",
    color: "#7c3aed", fontWeight: 600,
  },
  reportLocation: { fontSize: 13, color: "#7c3aed", fontFamily: "sans-serif", margin: "0 0 8px", fontWeight: 500 },
  reportDesc: { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif", lineHeight: 1.7, margin: "0 0 12px" },
  editReportBtn: {
    padding: "7px 16px", borderRadius: 20,
    border: "1.5px solid #9d4edd", background: "transparent",
    color: "#9d4edd", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif",
  },
};