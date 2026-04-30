import { useState, useEffect, useCallback } from "react";
import API from "../services/api";

const PULSE_CSS = `
  @keyframes sosPulse {
    0%, 100% { transform: scale(1);    opacity: 1; }
    50%       { transform: scale(1.08); opacity: 0.85; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const fmt = (d) =>
  new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

function mapsLink(lat, lng)       { return `https://www.google.com/maps?q=${lat},${lng}`; }
function directionsLink(lat, lng) { return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`; }

function getTimeAgo(date) {
  const s = Math.floor((new Date() - new Date(date)) / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m} min${m !== 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hr${h !== 1 ? "s" : ""} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) !== 1 ? "s" : ""} ago`;
}

// OpenStreetMap embed — no API key required
function MapEmbed({ lat, lng }) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e9d5ff", marginBottom: 16 }}>
      <iframe
        title="Alert Location Map"
        src={src}
        width="100%"
        height="220"
        style={{ border: "none", display: "block" }}
        loading="lazy"
      />
    </div>
  );
}

export default function IncomingAlertsPage() {
  const token = localStorage.getItem("token");

  const [alerts,         setAlerts]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [expandedId,     setExpandedId]     = useState(null);
  const [autoRefresh,    setAutoRefresh]    = useState(true);
  const [lastRefreshed,  setLastRefreshed]  = useState(null);
  const [now,            setNow]            = useState(new Date());

  // Keep "X minutes ago" labels fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await API.get("/api/sos/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // De-duplicate: show only the newest alert per sender
      const seen = new Map();
      for (const a of (res.data || [])) {
        const key = a.senderId?.toString();
        if (!seen.has(key) || new Date(a.createdAt) > new Date(seen.get(key).createdAt)) {
          seen.set(key, a);
        }
      }
      setAlerts([...seen.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[IncomingAlerts] fetch error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAlerts();
    if (!autoRefresh) return;
    const t = setInterval(fetchAlerts, 10000);
    return () => clearInterval(t);
  }, [fetchAlerts, autoRefresh]);

  const handleRespond = async (alertId) => {
    try {
      await API.post(`/api/sos/${alertId}/respond`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
  };

  return (
    <div style={S.wrapper}>
      <style>{PULSE_CSS}</style>
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.sub}>SAFETY — INCOMING ALERTS</p>
          <h1 style={S.title}>SOS Alerts from Contacts</h1>
          <div style={S.divider} />
          <p style={S.desc}>
            Active SOS alerts from your trusted contacts. Tap any card to view their location and get directions.
          </p>
        </div>

        {/* Refresh controls */}
        <div style={S.refreshRow}>
          <label style={S.refreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7c3aed" }}
            />
            Auto-refresh every 10 seconds
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastRefreshed && (
              <span style={{ fontSize: 11, color: "#c084c4", fontFamily: "sans-serif" }}>
                Updated: {fmt(lastRefreshed)}
              </span>
            )}
            <button onClick={fetchAlerts} style={S.refreshBtn}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Count banner */}
        <div style={{
          ...S.countBanner,
          background: alerts.length > 0 ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${alerts.length > 0 ? "#fecdd3" : "#bbf7d0"}`,
        }}>
          <span style={{ fontSize: 18 }}>{alerts.length > 0 ? "🔔" : "✅"}</span>
          <span style={{
            fontSize: 14, fontWeight: 700, fontFamily: "sans-serif",
            color: alerts.length > 0 ? "#dc2626" : "#166534",
          }}>
            {alerts.length > 0
              ? `${alerts.length} active SOS alert${alerts.length !== 1 ? "s" : ""}`
              : "No active alerts right now"}
          </span>
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={S.spinner} />
            <p style={{ color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14, marginTop: 16 }}>
              Checking for active alerts…
            </p>
          </div>

        ) : alerts.length === 0 ? (
          <div style={S.emptyBox}>
            <p style={{ fontSize: 48, margin: "0 0 16px" }}>🔔</p>
            <p style={{ fontSize: 16, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600, marginBottom: 8 }}>
              No active SOS alerts
            </p>
            <p style={{ fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 20, lineHeight: 1.7 }}>
              When one of your trusted contacts triggers an SOS, it will appear here instantly.
            </p>
            {/* Explain the phone-number matching requirement */}
            <div style={S.emptyTip}>
              <span>💡</span>
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>Not seeing an alert?</strong>
                Make sure the contact has their phone number saved in their SheVerse profile
                (Settings → Profile), and that you saved them in Trusted Contacts using that exact number.
                Phone numbers are matched after stripping spaces and country codes.
              </div>
            </div>
          </div>

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {alerts.map((alert) => {
              const isExpanded = expandedId === alert._id;
              const timeAgo    = getTimeAgo(alert.createdAt);

              return (
                <div
                  key={alert._id}
                  style={{
                    ...S.alertCard,
                    border: isExpanded ? "2px solid #dc2626" : "1.5px solid #fca5a5",
                    boxShadow: isExpanded
                      ? "0 8px 30px rgba(220,38,38,0.18)"
                      : "0 4px 20px rgba(220,38,38,0.08)",
                  }}
                >
                  {/* Badge row */}
                  <div style={S.alertHeader}>
                    <div style={S.alertBadge}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "sosPulse 1.5s infinite", flexShrink: 0 }} />
                      ACTIVE SOS
                      <span style={{ background: "#fff", color: "#dc2626", padding: "2px 8px", borderRadius: 12, fontSize: 10 }}>
                        {timeAgo}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: "#c084c4", fontFamily: "sans-serif" }}>
                      {fmt(alert.createdAt)}
                    </span>
                  </div>

                  {/* Sender info */}
                  <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={S.senderAvatar}>
                      {alert.senderName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600 }}>
                        {alert.senderName}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.5 }}>
                        {alert.message || "🚨 SOS Emergency! I need immediate help."}
                      </p>
                    </div>
                  </div>

                  {/* Coordinates + expand toggle */}
                  <div style={S.locationRow}>
                    <span>📍</span>
                    <code style={S.coordsCode}>
                      {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                    </code>
                    <button
                      style={S.expandBtn}
                      onClick={() => setExpandedId(isExpanded ? null : alert._id)}
                    >
                      {isExpanded ? "▲ Hide map" : "▼ Show map & actions"}
                    </button>
                  </div>

                  {/* Expanded section */}
                  {isExpanded && (
                    <div style={{ marginTop: 16, animation: "fadeSlideUp 0.3s ease" }}>
                      <MapEmbed lat={alert.latitude} lng={alert.longitude} />

                      {/* Quick stats */}
                      <div style={S.statsRow}>
                        <div style={S.statBox}>
                          <span>🕐</span>
                          <span style={S.statLabel}>Alert Age</span>
                          <strong style={S.statVal}>{timeAgo}</strong>
                        </div>
                        <div style={S.statBox}>
                          <span>👥</span>
                          <span style={S.statLabel}>Contacts Notified</span>
                          <strong style={S.statVal}>{alert.notifiedContacts?.length || 0}</strong>
                        </div>
                        {alert.senderPhone && (
                          <div style={S.statBox}>
                            <span>📞</span>
                            <span style={S.statLabel}>Phone</span>
                            <strong style={S.statVal}>{alert.senderPhone}</strong>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={S.actionBtns}>
                        <a href={mapsLink(alert.latitude, alert.longitude)} target="_blank" rel="noreferrer" style={S.btnRed}>
                          🗺️ Open in Google Maps
                        </a>
                        <a href={directionsLink(alert.latitude, alert.longitude)} target="_blank" rel="noreferrer" style={S.btnPurple}>
                          🚗 Get Directions
                        </a>
                        {alert.senderPhone && (
                          <a href={`tel:${alert.senderPhone}`} style={S.btnGreen}>
                            📞 Call {alert.senderName?.split(" ")[0]}
                          </a>
                        )}
                        <button style={S.btnOutline} onClick={() => handleRespond(alert._id)}>
                          ✅ I'll Help
                        </button>
                      </div>
                    </div>
                  )}

                  {!isExpanded && (
                    <p style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#c084c4", fontFamily: "sans-serif" }}>
                      Tap "Show map &amp; actions" to view the location
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* What-to-do guide */}
        <div style={S.tipsBox}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, color: "#3b0764", fontFamily: "sans-serif" }}>
            <span>💡</span>
            <strong>What to do when you receive an SOS alert:</strong>
          </div>
          <ol style={{ margin: "0 0 16px 20px", padding: 0, fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 2 }}>
            <li><strong>Stay calm</strong> — check the person's location on the map.</li>
            <li><strong>Call them immediately</strong> to assess the situation.</li>
            <li>If they don't answer, <strong>call emergency services (999)</strong> and share the coordinates.</li>
            <li><strong>Share your ETA</strong> if you're going to them in person.</li>
            <li>Keep checking the map — their location updates in real time.</li>
          </ol>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, paddingTop: 12, borderTop: "1px solid #e9d5ff", fontSize: 11, color: "#7c3aed", fontFamily: "sans-serif" }}>
            <span>📞 Emergency Numbers (Bangladesh):</span>
            <span>Police: <strong>999</strong></span>
            <span>Fire/Ambulance: <strong>199</strong></span>
            <span>Women Helpline: <strong>10921</strong></span>
            <span>National Helpline: <strong>333</strong></span>
          </div>
        </div>

        <div style={{ marginTop: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "14px 18px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontFamily: "sans-serif", lineHeight: 1.7 }}>
            📝 <strong>Note:</strong> Alerts shown here are unresolved and from the last 24 hours.
            The sender can cancel the alert by pressing "I'm Safe" on their SOS page.
            Your phone number must be registered in your profile for the phone-number matching to work.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  wrapper: { minHeight: "100vh", background: "rgba(255,245,250,0.85)", fontFamily: "'Georgia', serif" },
  page:    { maxWidth: 860, margin: "0 auto", padding: "40px 24px 60px" },

  header:  { textAlign: "center", marginBottom: 24 },
  sub:     { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  title:   { fontSize: 32, fontWeight: 400, color: "#3b0764", margin: "0 0 14px" },
  divider: { width: 48, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  desc:    { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" },

  refreshRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20, padding: "8px 16px",
    background: "rgba(255,255,255,0.9)", borderRadius: 12, border: "1px solid #f3e8ff",
    flexWrap: "wrap", gap: 10,
  },
  refreshLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", cursor: "pointer" },
  refreshBtn:   { padding: "6px 16px", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },

  countBanner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 40, padding: "10px 24px", marginBottom: 24, width: "fit-content", marginLeft: "auto", marginRight: "auto", flexWrap: "wrap" },

  spinner: { width: 40, height: 40, borderRadius: "50%", border: "3px solid #f3e8ff", borderTop: "3px solid #7c3aed", animation: "spin 1s linear infinite", margin: "0 auto" },

  emptyBox: { textAlign: "center", padding: "60px 20px" },
  emptyTip: { display: "inline-flex", alignItems: "flex-start", gap: 10, background: "#fdf4ff", padding: "14px 18px", borderRadius: 14, fontSize: 12, color: "#7c3aed", fontFamily: "sans-serif", textAlign: "left", maxWidth: 460, lineHeight: 1.6 },

  alertCard:   { background: "#fff", borderRadius: 20, padding: "20px 24px", transition: "all 0.2s", animation: "fadeSlideUp 0.3s ease" },
  alertHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 },
  alertBadge:  { display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", color: "#dc2626", padding: "6px 14px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1.5, border: "1px solid #fca5a5" },

  senderAvatar: { width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontFamily: "sans-serif", fontWeight: 600, flexShrink: 0 },

  locationRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "12px 0", borderTop: "1px solid #f3e8ff", borderBottom: "1px solid #f3e8ff" },
  coordsCode:  { fontSize: 12, fontFamily: "monospace", color: "#3b0764", background: "#fdf4ff", padding: "4px 10px", borderRadius: 12 },
  expandBtn:   { background: "transparent", border: "1px solid #e9d5ff", borderRadius: 20, padding: "5px 14px", fontSize: 11, color: "#7c3aed", cursor: "pointer", fontFamily: "sans-serif", marginLeft: "auto" },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 16 },
  statBox:  { background: "#fdf4ff", borderRadius: 12, padding: 12, textAlign: "center", display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" },
  statLabel:{ fontSize: 10, letterSpacing: 0.5 },
  statVal:  { fontSize: 13, color: "#3b0764" },

  actionBtns: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnRed:    { flex: 1, padding: "10px 16px", background: "linear-gradient(135deg,#dc2626,#f87171)", color: "#fff", borderRadius: 20, fontSize: 12, fontFamily: "sans-serif", textDecoration: "none", textAlign: "center", fontWeight: 600, minWidth: 140 },
  btnPurple: { flex: 1, padding: "10px 16px", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", borderRadius: 20, fontSize: 12, fontFamily: "sans-serif", textDecoration: "none", textAlign: "center", fontWeight: 600, minWidth: 140 },
  btnGreen:  { flex: 1, padding: "10px 16px", background: "#166534", color: "#fff", borderRadius: 20, fontSize: 12, fontFamily: "sans-serif", textDecoration: "none", textAlign: "center", fontWeight: 600, minWidth: 140 },
  btnOutline:{ flex: 1, padding: "10px 16px", background: "transparent", color: "#166534", border: "1.5px solid #bbf7d0", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600, minWidth: 140 },

  tipsBox: { marginTop: 32, background: "#fdf4ff", border: "1px solid #f3e8ff", borderRadius: 20, padding: "20px 24px" },
};