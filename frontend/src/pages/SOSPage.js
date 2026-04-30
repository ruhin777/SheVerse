import { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";

// ── CSS animations ────────────────────────────────────────────────────────────
const PULSE_CSS = `
  @keyframes sosPulse {
    0%, 100% { transform: scale(1);    opacity: 1; }
    50%       { transform: scale(1.08); opacity: 0.85; }
  }
  @keyframes ringExpand {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes blinkDot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.2; }
  }
  .sos-ring {
    position: absolute;
    border-radius: 50%;
    border: 3px solid rgba(220,38,38,0.6);
    animation: ringExpand 1.8s ease-out infinite;
    pointer-events: none;
  }
  .sos-ring:nth-child(2) { animation-delay: 0.6s; }
  .sos-ring:nth-child(3) { animation-delay: 1.2s; }
`;

const EMERGENCY_NUMBERS = [
  { label: "Police",            number: "999",          emoji: "👮", color: "#1d4ed8", bg: "#eff6ff" },
  { label: "Fire Service",      number: "199",          emoji: "🚒", color: "#ea580c", bg: "#fff7ed" },
  { label: "Ambulance",         number: "199",          emoji: "🚑", color: "#16a34a", bg: "#f0fdf4" },
  { label: "National Helpline", number: "333",          emoji: "📞", color: "#7c3aed", bg: "#fdf4ff" },
  { label: "Women Helpline",    number: "10921",        emoji: "🌸", color: "#db2777", bg: "#fdf2f8" },
  { label: "RAB",               number: "01730-336333", emoji: "🛡️", color: "#0f766e", bg: "#f0fdfa" },
];

const SAFETY_TIPS = [
  { tip: "Share your live location with a trusted contact before traveling alone at night.", icon: "📍" },
  { tip: "Keep your phone charged. Consider keeping a portable charger in your bag.", icon: "🔋" },
  { tip: "Memorise at least one trusted contact's phone number by heart.", icon: "🧠" },
  { tip: "Trust your instincts — if something feels wrong, move to a public, well-lit area.", icon: "💡" },
  { tip: "Add trusted contacts in the app so they are alerted instantly in an emergency.", icon: "👥" },
];

const fmt = (d) =>
  new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function SOSPage() {
  const token = localStorage.getItem("token");

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase,        setPhase]        = useState("idle");   // idle|countdown|sending|active|error
  const [sosActive,    setSosActive]    = useState(false);
  const [countdown,    setCountdown]    = useState(5);
  const [coords,       setCoords]       = useState(null);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [activeAlert,  setActiveAlert]  = useState(null);
  const [message,      setMessage]      = useState("🚨 I need help! This is an emergency.");
  const [myHistory,    setMyHistory]    = useState([]);
  const [incoming,     setIncoming]     = useState([]);
  const [contacts,     setContacts]     = useState([]);
  const [tab,          setTab]          = useState("sos");
  const [showTips,     setShowTips]     = useState(false);
  const [tipIndex,     setTipIndex]     = useState(0);
  const [resolving,    setResolving]    = useState(false);

  const countdownRef = useRef(null);
  const cancelledRef = useRef(false);

  // Rotate safety tips
  useEffect(() => {
    const t = setInterval(() => setTipIndex((i) => (i + 1) % SAFETY_TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    try {
      const r = await API.get("/api/contacts", { headers: { Authorization: `Bearer ${token}` } });
      setContacts(r.data || []);
    } catch (_) {}
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const r = await API.get("/api/sos/my", { headers: { Authorization: `Bearer ${token}` } });
      setMyHistory(r.data || []);
    } catch (_) {}
  }, [token]);

  const fetchIncoming = useCallback(async () => {
    if (!token) return;
    try {
      const r = await API.get("/api/sos/alerts", { headers: { Authorization: `Bearer ${token}` } });
      setIncoming(r.data || []);
    } catch (_) {}
  }, [token]);

  const fetchActive = useCallback(async () => {
    if (!token) return;
    try {
      const r = await API.get("/api/sos/active", { headers: { Authorization: `Bearer ${token}` } });
      if (r.data) {
        setActiveAlert(r.data);
        setSosActive(true);
        setPhase("active");
        setCoords({ lat: r.data.latitude, lng: r.data.longitude });
      } else {
        setSosActive(false);
        setActiveAlert(null);
        if (phase === "active") setPhase("idle");
      }
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchContacts();
    fetchHistory();
    fetchIncoming();
    fetchActive();
    const poll = setInterval(() => { fetchIncoming(); fetchActive(); }, 15000);
    return () => clearInterval(poll);
  }, [fetchContacts, fetchHistory, fetchIncoming, fetchActive]);

  // ── Countdown flow ─────────────────────────────────────────────────────────
  const startSOS = () => {
    if (phase !== "idle") return;
    cancelledRef.current = false;
    setPhase("countdown");
    setCountdown(5);
    setErrorMsg("");

    let count = 5;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        if (!cancelledRef.current) triggerSOS();
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    cancelledRef.current = true;
    setPhase("idle");
    setCountdown(5);
  };

  // ── Trigger SOS ────────────────────────────────────────────────────────────
  const triggerSOS = () => {
    setPhase("sending");

    const sendWithCoords = async (lat, lng) => {
      try {
        const res = await API.post(
          "/api/sos",
          {
            latitude:  parseFloat(lat)  || 23.8103,
            longitude: parseFloat(lng) || 90.4125,
            message:   message?.trim() || "🚨 I need help! This is an emergency.",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setActiveAlert(res.data.alert);
        setSosActive(true);
        setPhase("active");
        setCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
        fetchHistory();
        fetchActive();
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Something went wrong. Please try again.";
        setErrorMsg(msg);
        setPhase("error");
      }
    };

    if (!navigator.geolocation) {
      sendWithCoords(23.8103, 90.4125);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => sendWithCoords(pos.coords.latitude, pos.coords.longitude),
      ()    => sendWithCoords(23.8103, 90.4125),   // always fall back, never block
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // ── Resolve ────────────────────────────────────────────────────────────────
  const resolveAlert = async (alertId) => {
    if (!alertId || resolving) return;
    setResolving(true);
    try {
      await API.patch(`/api/sos/${alertId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSosActive(false);
      setActiveAlert(null);
      setPhase("idle");
      setCoords(null);
      setCountdown(5);
      fetchHistory();
      fetchActive();
    } catch (_) {}
    setResolving(false);
  };

  // SVG countdown ring
  const RADIUS = 70;
  const CIRC   = 2 * Math.PI * RADIUS;

  return (
    <div style={S.wrapper}>
      <style>{PULSE_CSS}</style>
      <div style={S.page}>

        {/* ── Header ── */}
        <div style={S.header}>
          <p style={S.sub}>SAFETY — EMERGENCY</p>
          <h1 style={S.title}>SOS Alert</h1>
          <div style={S.divider} />
          <p style={S.desc}>
            Press SOS to immediately alert all your trusted contacts with your live location.
          </p>
        </div>

        {/* ── Rotating safety tip banner ── */}
        <div style={S.tipBanner} key={tipIndex}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{SAFETY_TIPS[tipIndex].icon}</span>
          <p style={S.tipText}>{SAFETY_TIPS[tipIndex].tip}</p>
        </div>

        {/* ── Tabs ── */}
        <div style={S.tabBar}>
          {[
            { key: "sos",      label: "🚨 SOS" },
            { key: "incoming", label: `🔔 Incoming (${incoming.length})` },
            { key: "history",  label: `📋 My History (${myHistory.length})` },
            { key: "numbers",  label: "📞 Emergency Numbers" },
          ].map(({ key, label }) => (
            <button
              key={key}
              style={{ ...S.tabBtn, ...(tab === key ? S.tabActive : {}) }}
              onClick={() => {
                setTab(key);
                if (key === "history")  fetchHistory();
                if (key === "incoming") fetchIncoming();
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════ SOS TAB */}
        {tab === "sos" && (
          <div style={{ animation: "fadeSlideUp 0.4s ease" }}>

            {/* No contacts warning */}
            {contacts.length === 0 && (
              <div style={S.warnBox}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <strong style={{ display: "block", fontSize: 13, color: "#92400e" }}>
                    No trusted contacts added
                  </strong>
                  <span style={{ fontSize: 12, color: "#b45309" }}>
                    Go to Safety → Trusted Contacts to add contacts before using SOS.
                  </span>
                </div>
              </div>
            )}

            {/* Active SOS banner */}
            {sosActive && activeAlert && (
              <div style={S.activeBanner}>
                <div style={S.activeBannerLeft}>
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#dc2626", animation: "blinkDot 1s infinite", flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: 14, color: "#7f1d1d", display: "block" }}>
                      🚨 SOS is ACTIVE
                    </strong>
                    <span style={{ fontSize: 12, color: "#b91c1c" }}>
                      {activeAlert.notifiedContacts?.length || 0} contact(s) notified
                      {coords ? ` · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ""}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {coords && (
                    <a href={mapsLink(coords.lat, coords.lng)} target="_blank" rel="noreferrer" style={S.mapsLinkBtn}>
                      🗺️ My Location
                    </a>
                  )}
                  <button
                    style={S.resolveBtn}
                    onClick={() => resolveAlert(activeAlert._id)}
                    disabled={resolving}
                  >
                    {resolving ? "…" : "✅ I'm Safe"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Main SOS area ── */}
            <div style={S.sosCenter}>

              {/* COUNTDOWN */}
              {phase === "countdown" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: "fadeSlideUp 0.3s ease" }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#dc2626", fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1 }}>
                    Sending SOS in…
                  </p>
                  <div style={{ position: "relative", width: 180, height: 180 }}>
                    <svg width="180" height="180" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                      <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#f3e8ff" strokeWidth="6" />
                      <circle
                        cx="90" cy="90" r={RADIUS} fill="none"
                        stroke="#dc2626" strokeWidth="6"
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC - (CIRC * countdown) / 5}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.9s linear" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 52, fontWeight: 700, color: "#dc2626", fontFamily: "sans-serif" }}>
                      {countdown}
                    </div>
                  </div>
                  <button style={S.cancelCountdownBtn} onClick={cancelCountdown}>
                    ✕ Cancel
                  </button>
                </div>
              )}

              {/* SENDING */}
              {phase === "sending" && (
                <div style={{ textAlign: "center", animation: "fadeSlideUp 0.3s ease" }}>
                  <div style={S.spinner} />
                  <p style={{ color: "#dc2626", fontFamily: "sans-serif", fontSize: 14, marginTop: 16 }}>
                    Getting your location &amp; sending alert…
                  </p>
                </div>
              )}

              {/* ERROR */}
              {phase === "error" && (
                <div style={{ textAlign: "center", animation: "fadeSlideUp 0.4s ease" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                  <p style={{ color: "#dc2626", fontFamily: "sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                    SOS Failed to Send
                  </p>
                  <p style={{ color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 13, marginBottom: 24, maxWidth: 360, lineHeight: 1.6 }}>
                    {errorMsg}
                  </p>
                  <button style={S.retryBtn} onClick={() => { setPhase("idle"); setErrorMsg(""); }}>
                    Try Again
                  </button>
                </div>
              )}

              {/* IDLE or ACTIVE — main button */}
              {(phase === "idle" || phase === "active") && (
                <div style={{ textAlign: "center", animation: "fadeSlideUp 0.5s ease" }}>
                  <div style={S.sosRingWrap}>
                    {sosActive && (
                      <>
                        <div className="sos-ring" style={{ width: 180, height: 180, top: -10, left: -10 }} />
                        <div className="sos-ring" style={{ width: 180, height: 180, top: -10, left: -10 }} />
                        <div className="sos-ring" style={{ width: 180, height: 180, top: -10, left: -10 }} />
                      </>
                    )}
                    <button
                      style={{
                        ...S.sosBtn,
                        background: sosActive
                          ? "linear-gradient(135deg,#991b1b,#dc2626)"
                          : "linear-gradient(135deg,#dc2626,#f87171)",
                        animation: sosActive ? "sosPulse 1.8s ease-in-out infinite" : "none",
                        cursor: sosActive ? "default" : "pointer",
                      }}
                      onClick={sosActive ? undefined : startSOS}
                      disabled={sosActive}
                    >
                      <span style={{ fontSize: 36, marginBottom: 4, display: "block" }}>🆘</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "sans-serif", letterSpacing: 3 }}>
                        {sosActive ? "ACTIVE" : "SOS"}
                      </span>
                    </button>
                  </div>

                  <p style={S.sosHint}>
                    {sosActive
                      ? "Your trusted contacts have been alerted with your location."
                      : contacts.length === 0
                      ? "Add trusted contacts first to use SOS."
                      : `Tap to alert ${contacts.length} contact${contacts.length !== 1 ? "s" : ""}. You have 5 seconds to cancel.`}
                  </p>

                  {/* Custom message — only shown when idle */}
                  {!sosActive && (
                    <div style={S.msgGroup}>
                      <label style={S.msgLabel}>CUSTOM EMERGENCY MESSAGE (optional)</label>
                      <textarea
                        style={S.msgInput}
                        rows={2}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Your emergency message…"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info pills */}
            <div style={S.pillRow}>
              <InfoPill icon="📍" text="Your GPS location is sent with every alert." />
              <InfoPill icon="👥" text={`${contacts.length} trusted contact${contacts.length !== 1 ? "s" : ""} will be notified.`} />
              <InfoPill icon="🔗" text="Contacts get a Google Maps link to your location." />
            </div>

            {/* Contacts preview */}
            {contacts.length > 0 && (
              <div style={S.contactPreview}>
                <p style={S.contactPreviewTitle}>WHO WILL BE ALERTED</p>
                <div style={S.contactChips}>
                  {contacts.map((c) => (
                    <div key={c._id} style={S.contactChip}>
                      <div style={S.chipAvatar}>{c.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <p style={S.chipName}>{c.name}</p>
                        <p style={S.chipPhone}>📞 {c.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety tips */}
            <div style={S.tipsToggleRow}>
              <button style={S.tipsToggleBtn} onClick={() => setShowTips((v) => !v)}>
                {showTips ? "▲ Hide Safety Tips" : "▼ Show Safety Tips"}
              </button>
            </div>
            {showTips && (
              <div style={S.tipsGrid}>
                {SAFETY_TIPS.map((t, i) => (
                  <div key={i} style={S.tipCard}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
                    <p style={S.tipCardText}>{t.tip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════ INCOMING TAB */}
        {tab === "incoming" && (
          <div style={S.historyWrap}>
            {incoming.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={{ fontSize: 40, margin: "0 0 10px" }}>🔔</p>
                <p style={S.emptyText}>No active SOS alerts from your contacts.</p>
                <p style={{ fontSize: 12, color: "#c084c4", fontFamily: "sans-serif" }}>
                  Alerts from the last 24 hours appear here automatically.
                </p>
              </div>
            ) : (
              incoming.map((alert) => (
                <div key={alert._id} style={S.incomingCard}>
                  <div style={S.incomingTop}>
                    <div style={S.incomingBadge}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "sosPulse 1.5s infinite" }} />
                      ACTIVE SOS
                    </div>
                    <span style={{ fontSize: 12, color: "#c084c4", fontFamily: "sans-serif" }}>{fmt(alert.createdAt)}</span>
                  </div>
                  <h3 style={S.incomingName}>🚨 {alert.senderName} needs help!</h3>
                  <p style={S.incomingMsg}>{alert.message}</p>
                  <div style={S.incomingActions}>
                    <a href={mapsLink(alert.latitude, alert.longitude)} target="_blank" rel="noreferrer" style={S.incomingMapBtn}>
                      📍 Open Location
                    </a>
                    {alert.senderPhone && (
                      <a href={`tel:${alert.senderPhone}`} style={S.incomingCallBtn}>
                        📞 Call Now
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════ HISTORY TAB */}
        {tab === "history" && (
          <div style={S.historyWrap}>
            {myHistory.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={{ fontSize: 40, margin: "0 0 10px" }}>📋</p>
                <p style={S.emptyText}>You haven't sent any SOS alerts yet.</p>
              </div>
            ) : (
              myHistory.map((alert) => (
                <div key={alert._id} style={S.historyCard}>
                  <div style={S.historyTop}>
                    <span style={{
                      ...S.historyBadge,
                      background: alert.resolved ? "#f0fdf4" : "#fef2f2",
                      color:      alert.resolved ? "#166534" : "#dc2626",
                      border:     `1px solid ${alert.resolved ? "#bbf7d0" : "#fecdd3"}`,
                    }}>
                      {alert.resolved ? "✅ Resolved" : "🔴 Active"}
                    </span>
                    <span style={{ fontSize: 12, color: "#c084c4", fontFamily: "sans-serif" }}>{fmt(alert.createdAt)}</span>
                  </div>
                  <p style={S.historyMsg}>{alert.message}</p>
                  <p style={S.historyCoords}>
                    📍 {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                    <a href={mapsLink(alert.latitude, alert.longitude)} target="_blank" rel="noreferrer"
                      style={{ marginLeft: 10, color: "#7c3aed", fontSize: 11 }}>
                      View on Maps →
                    </a>
                  </p>
                  {alert.notifiedContacts?.length > 0 && (
                    <p style={S.historyContacts}>
                      👥 Alerted: {alert.notifiedContacts.map((c) => c.name).join(", ")}
                    </p>
                  )}
                  {!alert.resolved && (
                    <button
                      style={S.resolveHistBtn}
                      disabled={resolving}
                      onClick={async () => {
                        setResolving(true);
                        try {
                          await API.patch(`/api/sos/${alert._id}/resolve`, {}, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          fetchHistory();
                          fetchActive();
                          if (activeAlert?._id === alert._id) {
                            setSosActive(false);
                            setActiveAlert(null);
                            setPhase("idle");
                          }
                        } catch (_) {}
                        setResolving(false);
                      }}
                    >
                      {resolving ? "…" : "✅ Mark as Resolved"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════ EMERGENCY NUMBERS TAB */}
        {tab === "numbers" && (
          <div>
            <p style={{ fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, marginBottom: 20, textAlign: "center" }}>
              Official emergency contact numbers for Bangladesh. Tap any card to call directly.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
            {[
        { label: "Police",            number: "999",          emoji: "👮", color: "#1d4ed8", bg: "#eff6ff" },
        { label: "Ambulance",         number: "199",          emoji: "🚑", color: "#16a34a", bg: "#f0fdf4" },
        { label: "Women Helpline",    number: "10921",        emoji: "🌸", color: "#db2777", bg: "#fdf2f8" },
        { label: "National Helpline", number: "333",          emoji: "📞", color: "#7c3aed", bg: "#fdf4ff" },
        { label: "Fire Service",      number: "199",          emoji: "🚒", color: "#ea580c", bg: "#fff7ed" },
        { label: "RAB",               number: "01730-336333", emoji: "🛡️", color: "#0f766e", bg: "#f0fdfa" },
      ].map((n) => (
                <a key={n.label} href={`tel:${n.number}`} style={{
                  background: n.bg, border: `1.5px solid ${n.color}22`,
                  borderRadius: 16, padding: "20px 16px", textAlign: "center",
                  display: "block", textDecoration: "none", transition: "transform 0.15s",
                }}>
                  <span style={{ fontSize: 28, marginBottom: 6, display: "block" }}>{n.emoji}</span>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontFamily: "sans-serif", fontWeight: 600, color: n.color }}>{n.label}</p>
                  <p style={{ margin: "0 0 10px", fontSize: 22, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 2, color: n.color }}>{n.number}</p>
                  <span style={{ display: "inline-block", fontSize: 10, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 1.5, padding: "4px 12px", borderRadius: 20, background: n.color + "18", color: n.color }}>
                    Tap to Call
                  </span>
                </a>
              ))}
            </div>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "14px 18px" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontFamily: "sans-serif", lineHeight: 1.7 }}>
                📝 <strong>Note:</strong> Always describe your exact location clearly when calling emergency services. Stay on the line until help arrives.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── InfoPill ──────────────────────────────────────────────────────────────────
function InfoPill({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#fdf4ff", border: "1px solid #f3e8ff", borderRadius: 12, padding: "10px 14px", flex: 1, minWidth: 160 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  wrapper: { minHeight: "100vh", background: "rgba(255,245,250,0.85)", fontFamily: "'Georgia', serif" },
  page:    { maxWidth: 780, margin: "0 auto", padding: "40px 24px 60px" },

  header:  { textAlign: "center", marginBottom: 24 },
  sub:     { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  title:   { fontSize: 32, fontWeight: 400, color: "#3b0764", margin: "0 0 14px" },
  divider: { width: 48, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  desc:    { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, maxWidth: 460, margin: "0 auto" },

  tipBanner: { display: "flex", alignItems: "flex-start", gap: 12, background: "linear-gradient(135deg,#fdf4ff,#fce7f3)", border: "1px solid #f3e8ff", borderRadius: 14, padding: "12px 18px", marginBottom: 24, animation: "fadeSlideUp 0.5s ease" },
  tipText:   { margin: 0, fontSize: 12, color: "#7c3aed", fontFamily: "sans-serif", lineHeight: 1.7 },

  tabBar:    { display: "flex", gap: 6, background: "#f3e8ff", borderRadius: 14, padding: 5, marginBottom: 28, flexWrap: "wrap" },
  tabBtn:    { flex: 1, padding: "10px 8px", border: "none", borderRadius: 10, background: "transparent", cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 0.3, transition: "all 0.25s", minWidth: 80 },
  tabActive: { background: "#ffffff", color: "#7c3aed", boxShadow: "0 2px 10px rgba(124,58,237,0.13)", fontWeight: 600 },

  warnBox: { display: "flex", alignItems: "flex-start", gap: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "14px 18px", marginBottom: 20 },

  activeBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 16, padding: "16px 20px", marginBottom: 24, flexWrap: "wrap", gap: 12, boxShadow: "0 4px 20px rgba(220,38,38,0.12)" },
  activeBannerLeft: { display: "flex", alignItems: "center", gap: 12 },
  resolveBtn: { padding: "9px 18px", background: "linear-gradient(135deg,#166534,#15803d)", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600 },
  mapsLinkBtn: { padding: "9px 18px", background: "transparent", color: "#7c3aed", border: "1.5px solid #e9d5ff", borderRadius: 20, fontSize: 12, fontFamily: "sans-serif", textDecoration: "none", display: "inline-flex", alignItems: "center" },

  sosCenter: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 28px" },
  sosRingWrap: { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 160, height: 160, marginBottom: 24 },
  sosBtn: {
    width: 160, height: 160, borderRadius: "50%", border: "none",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 40px rgba(220,38,38,0.4), 0 0 0 8px rgba(220,38,38,0.08)",
    transition: "transform 0.15s",
  },
  sosHint: { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, maxWidth: 360, textAlign: "center", margin: "0 auto 20px" },

  msgGroup: { width: "100%", maxWidth: 480 },
  msgLabel: { display: "block", fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  msgInput: { width: "100%", padding: "12px 16px", border: "1.5px solid #e9d5ff", borderRadius: 12, fontSize: 13, fontFamily: "sans-serif", color: "#3b0764", background: "#fff", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6 },

  cancelCountdownBtn: { padding: "10px 28px", background: "transparent", color: "#9d4edd", border: "1.5px solid #e9d5ff", borderRadius: 20, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif" },
  spinner: { width: 48, height: 48, borderRadius: "50%", border: "4px solid #f3e8ff", borderTop: "4px solid #dc2626", animation: "spin 0.9s linear infinite", margin: "0 auto" },
  retryBtn: { padding: "11px 28px", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif" },

  pillRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 },

  contactPreview:      { background: "rgba(255,255,255,0.97)", borderRadius: 16, padding: "20px 24px", border: "1px solid #f3e8ff", boxShadow: "0 4px 20px rgba(157,107,157,0.09)", marginBottom: 20 },
  contactPreviewTitle: { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 14px" },
  contactChips:        { display: "flex", flexWrap: "wrap", gap: 10 },
  contactChip:         { display: "flex", alignItems: "center", gap: 10, background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 14, padding: "8px 14px 8px 8px" },
  chipAvatar:          { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, flexShrink: 0 },
  chipName:            { margin: 0, fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600 },
  chipPhone:           { margin: "2px 0 0", fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif" },

  tipsToggleRow: { textAlign: "center", marginBottom: 16 },
  tipsToggleBtn: { padding: "8px 20px", background: "transparent", color: "#9d4edd", border: "1.5px solid #e9d5ff", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  tipsGrid:      { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  tipCard:       { display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.97)", border: "1px solid #f3e8ff", borderRadius: 14, padding: "14px 18px", boxShadow: "0 2px 12px rgba(157,107,157,0.07)", animation: "fadeSlideUp 0.3s ease" },
  tipCardText:   { margin: 0, fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", lineHeight: 1.7 },

  historyWrap: { display: "flex", flexDirection: "column", gap: 14 },
  emptyBox:    { textAlign: "center", padding: "60px 20px" },
  emptyText:   { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14, margin: "0 0 8px" },

  incomingCard:    { background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1.5px solid #fca5a5", boxShadow: "0 4px 20px rgba(220,38,38,0.1)", animation: "fadeSlideUp 0.4s ease" },
  incomingTop:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  incomingBadge:   { display: "flex", alignItems: "center", gap: 6, background: "#fef2f2", color: "#dc2626", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1.5, padding: "4px 12px", borderRadius: 20, border: "1px solid #fca5a5" },
  incomingName:    { margin: "0 0 8px", fontSize: 18, color: "#7f1d1d", fontFamily: "sans-serif", fontWeight: 700 },
  incomingMsg:     { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", lineHeight: 1.6, margin: "0 0 16px" },
  incomingActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  incomingMapBtn:  { padding: "10px 20px", background: "linear-gradient(135deg,#dc2626,#f87171)", color: "#fff", borderRadius: 20, fontSize: 13, fontFamily: "sans-serif", textDecoration: "none", fontWeight: 600 },
  incomingCallBtn: { padding: "10px 20px", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", borderRadius: 20, fontSize: 13, fontFamily: "sans-serif", textDecoration: "none", fontWeight: 600 },

  historyCard:     { background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid #f3e8ff", boxShadow: "0 4px 20px rgba(157,107,157,0.09)" },
  historyTop:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 },
  historyBadge:    { fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, padding: "4px 12px", borderRadius: 20 },
  historyMsg:      { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", lineHeight: 1.6, margin: "0 0 8px" },
  historyCoords:   { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", margin: "0 0 6px" },
  historyContacts: { fontSize: 12, color: "#7c3aed", fontFamily: "sans-serif", margin: "0 0 12px" },
  resolveHistBtn:  { padding: "8px 20px", background: "transparent", color: "#166534", border: "1.5px solid #bbf7d0", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
};