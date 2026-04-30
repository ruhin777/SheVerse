import './App.css';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import API from "./services/api";

// ── Pages ─────────────────────────────────────────────────────────────────────
import PlacesPage          from "./pages/PlacesPage";
import TripPage            from "./pages/TripPage";
import AuthPage            from "./pages/AuthPage";
import TrustedContactsPage from "./pages/TrustedContactsPage";
import SOSPage             from "./pages/SOSPage";
import IncomingAlertsPage  from "./pages/IncomingAlertsPage";
import LiveLocationPage    from "./pages/LiveLocationPage";
import EmergencyServicesPage from "./pages/EmergencyServicesPage";
import IncidentReportPage  from "./pages/IncidentReportPage";
import MenstrualTracker    from "./pages/MenstrualTracker";
import LifestylePage       from "./pages/LifestylePage";
import ArticlesPage        from "./pages/ArticlesPage";
import ExercisePage        from "./pages/ExercisePage";
import AIBotPage           from "./pages/AIBotPage";
import GuidePage           from "./pages/GuidePage";
import HotelPage           from "./pages/HotelPage";
import MarketplacePage     from "./pages/MarketplacePage";
import PostPage            from "./pages/PostPage";
import GroupPage           from "./pages/GroupPage";
import ProfilePage         from "./pages/ProfilePage";
import MessagePage         from "./pages/MessagePage";



// ── Nav Structure ──
const NAV = [
  {
    section: "Safety",
    links: [
      { label: "SOS Alert",          path: "/safety/sos" },
      { label: "Live Location",      path: "/safety/location" },
      { label: "Emergency Services", path: "/safety/emergency" },
      { label: "Report Incident",    path: "/safety/report" },
      { label: "Trusted Contacts",   path: "/safety/contacts" },
    ],
  },
  {
    section: "Health",
    links: [
      { label: "Menstrual Tracker", path: "/health/menstrual" },
      { label: "Lifestyle & BMI",   path: "/health/lifestyle" },
      { label: "Articles & Tips",   path: "/health/articles" },
      { label: "Exercise Guidance", path: "/health/exercise" },
      { label: "AI Health Bot",     path: "/health/ai-bot" },
    ],
  },
  {
    section: "Travel",
    links: [
      { label: "Explore Places", path: "/travel/places" },
      { label: "Trip Planning",  path: "/travel/trips" },
      { label: "Female Guides",  path: "/travel/guides" },
      { label: "Hotel Booking",  path: "/travel/hotels" },
      { label: "Marketplace",    path: "/travel/marketplace" },
    ],
  },
  {
    section: "Social",
    links: [
      { label: "Community Feed", path: "/social/feed" },
      { label: "Groups",         path: "/social/groups" },
      { label: "My Profile",     path: "/social/profile" },
      { label: "Messages",       path: "/social/chat" },
    ],
  },
];

// ── Global CSS injected once ──────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes sosPulse {
    0%, 100% { transform: scale(1);    opacity: 1; }
    50%       { transform: scale(1.08); opacity: 0.85; }
  }
  @keyframes navRingExpand {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes badgePop {
    0%   { transform: scale(0); }
    70%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  @keyframes bellShake {
    0%, 100% { transform: rotate(0deg); }
    15%       { transform: rotate(-18deg); }
    30%       { transform: rotate(18deg); }
    45%       { transform: rotate(-12deg); }
    60%       { transform: rotate(12deg); }
    75%       { transform: rotate(-6deg); }
  }
  @keyframes toastSlide {
    from { transform: translateX(110%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  .nav-bell-shake {
    animation: bellShake 0.7s ease;
  }
  .toast-notification {
    animation: toastSlide 0.3s ease;
  }
`;

// ── ComingSoon placeholder ────────────────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <div style={P.wrap}>
      <div style={P.box}>
        <p style={P.sub}>COMING SOON</p>
        <h2 style={P.title}>{title}</h2>
        <div style={P.line} />
        <p style={P.desc}>This section is under development.<br />Check back soon.</p>
      </div>
    </div>
  );
}
const P = {
  wrap:  { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" },
  box:   { textAlign: "center", padding: 48 },
  sub:   { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 400, color: "#3b0764", fontFamily: "Georgia,serif", margin: "0 0 16px" },
  line:  { width: 40, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 20px" },
  desc:  { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.8 },
};

// ── Toast notification ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="toast-notification"
      style={{
        position: "fixed", top: 80, right: 24, zIndex: 2000,
        background: type === "success" ? "#166534" : "#9f1239",
        color: "#fff", padding: "13px 20px", borderRadius: 12,
        fontSize: 13, fontFamily: "sans-serif",
        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", gap: 10,
        maxWidth: 340,
      }}
    >
      <span style={{ fontSize: 16 }}>{type === "success" ? "✅" : "⚠️"}</span>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "transparent", border: "none",
          color: "#fff", cursor: "pointer", fontSize: 16, padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── NavbarSOS — must live INSIDE BrowserRouter so useNavigate works ───────────
function NavbarSOS({ token }) {
  const navigate = useNavigate();

  const [sosActive,      setSosActive]      = useState(false);
  const [incomingCount,  setIncomingCount]  = useState(0);
  const [bellShake,      setBellShake]      = useState(false);
  const [showSOSTip,     setShowSOSTip]     = useState(false);
  const [showBellTip,    setShowBellTip]    = useState(false);
  const [toast,          setToast]          = useState(null);
  const [sending,        setSending]        = useState(false);

  const prevCountRef = useRef(0);

  // ── Poll active alert + incoming count every 15 s ──────────────────────────
  const checkStatus = useCallback(async () => {
    if (!token) return;
    try {
      const r = await API.get("/api/sos/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSosActive(!!r.data);
    } catch (_) {}

    try {
      const r = await API.get("/api/sos/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const count = (r.data || []).length;
      // Shake bell only when count goes UP
      if (count > prevCountRef.current) {
        setBellShake(true);
        setTimeout(() => setBellShake(false), 800);
      }
      prevCountRef.current = count;
      setIncomingCount(count);
    } catch (_) {}
  }, [token]);

  useEffect(() => {
    checkStatus();
    const poll = setInterval(checkStatus, 15000);
    return () => clearInterval(poll);
  }, [checkStatus]);

  // ── One-tap SOS from navbar ────────────────────────────────────────────────
  const handleNavSOS = () => {
    // If already active, just navigate to the SOS page to show status
    if (sosActive) {
      navigate("/safety/sos");
      return;
    }
    if (sending) return;
    setSending(true);
    setToast(null);

    const sendWithCoords = async (lat, lng) => {
      try {
        const res = await API.post(
          "/api/sos",
          {
            latitude:  parseFloat(lat)  || 23.8103,
            longitude: parseFloat(lng) || 90.4125,
            message:   "🚨 SOS Emergency! I need immediate help.",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSosActive(true);
        setToast({
          type:    "success",
          message: `SOS sent! ${res.data.contactsNotified || 0} contact(s) alerted. Press again to view details.`,
        });
        checkStatus();
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to send SOS. Please try again.";
        setToast({ type: "error", message: msg });
      } finally {
        setSending(false);
      }
    };

    // Try GPS — if it times out or is denied, fall back to Dhaka center so the
    // SOS still goes through (the user can still be found via their contact info)
    if (!navigator.geolocation) {
      sendWithCoords(23.8103, 90.4125);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => sendWithCoords(pos.coords.latitude, pos.coords.longitude),
      ()    => sendWithCoords(23.8103, 90.4125),   // fallback — never block SOS
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Bell button (no <Link> wrapper — use navigate() instead) ── */}
      <div style={{ position: "relative" }}>
        <button
          className={bellShake ? "nav-bell-shake" : ""}
          onClick={() => navigate("/safety/incoming-alerts")}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            border: incomingCount > 0 ? "1.5px solid #fca5a5" : "1.5px solid #e9d5ff",
            background: incomingCount > 0 ? "#fef2f2" : "transparent",
            cursor: "pointer", fontSize: 17,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", transition: "all 0.2s",
            // No text-decoration issue because this is a <button>, not <a>
          }}
          onMouseEnter={() => setShowBellTip(true)}
          onMouseLeave={() => setShowBellTip(false)}
        >
          🔔
          {incomingCount > 0 && (
            <span
              style={{
                position: "absolute", top: -4, right: -4,
                minWidth: 17, height: 17, borderRadius: "50%",
                background: "#dc2626", color: "#fff",
                fontSize: 9, fontFamily: "sans-serif", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #fff",
                animation: "badgePop 0.3s ease",
                padding: "0 3px",
              }}
            >
              {incomingCount > 9 ? "9+" : incomingCount}
            </span>
          )}
        </button>

        {showBellTip && (
          <div style={tooltipStyle}>
            {incomingCount > 0
              ? `${incomingCount} active SOS alert${incomingCount !== 1 ? "s" : ""} from contacts`
              : "No active alerts right now"}
          </div>
        )}
      </div>

      {/* ── SOS button ── */}
      <div style={{ position: "relative" }}>
        <button
          onClick={handleNavSOS}
          disabled={sending}
          style={{
            padding: "7px 16px",
            background: sosActive
              ? "linear-gradient(135deg,#991b1b,#dc2626)"
              : "linear-gradient(135deg,#dc2626,#f87171)",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            cursor: sending ? "not-allowed" : "pointer",
            fontSize: 11,
            fontFamily: "sans-serif",
            fontWeight: 700,
            letterSpacing: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            animation: sosActive ? "sosPulse 1.8s ease-in-out infinite" : "none",
            boxShadow: sosActive
              ? "0 0 0 4px rgba(220,38,38,0.25)"
              : "0 2px 10px rgba(220,38,38,0.3)",
            transition: "background 0.2s, box-shadow 0.2s",
            position: "relative",
            overflow: "visible",
          }}
          onMouseEnter={() => setShowSOSTip(true)}
          onMouseLeave={() => setShowSOSTip(false)}
        >
          {/* Pulsing rings when SOS is active */}
          {sosActive && (
            <>
              <span style={{
                position: "absolute", inset: -5, borderRadius: 24,
                border: "2px solid rgba(220,38,38,0.6)",
                animation: "navRingExpand 1.8s ease-out infinite",
                pointerEvents: "none",
              }} />
              <span style={{
                position: "absolute", inset: -5, borderRadius: 24,
                border: "2px solid rgba(220,38,38,0.6)",
                animation: "navRingExpand 1.8s ease-out 0.6s infinite",
                pointerEvents: "none",
              }} />
            </>
          )}
          <span style={{ fontSize: 14 }}>
            {sending ? "⏳" : "🆘"}
          </span>
          {sending ? "SENDING…" : sosActive ? "SOS ACTIVE" : "SOS"}
        </button>

        {showSOSTip && (
          <div style={tooltipStyle}>
            {sosActive
              ? "SOS is active — click to view details"
              : "Tap to instantly alert all trusted contacts"}
          </div>
        )}
      </div>
    </div>
  );
}

const tooltipStyle = {
  position: "absolute", top: 44, right: 0,
  background: "#1e1b4b", color: "#fff",
  fontSize: 11, fontFamily: "sans-serif",
  padding: "6px 12px", borderRadius: 8,
  whiteSpace: "nowrap", zIndex: 999,
  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  pointerEvents: "none",
};

// ── Root App ──────────────────────────────────────────────────────────────────
function App() {
  const [user,          setUser]          = useState(null);
  const [menuOpen,      setMenuOpen]      = useState(null);
  const [profileViewId, setProfileViewId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch (_) {}
    }
  }, []);

  const handleLogin  = (userData) => setUser(userData);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  const token = localStorage.getItem("token");

  return (
    <div style={styles.app}>
      <style>{GLOBAL_CSS}</style>

      {/*
        BrowserRouter wraps everything so NavbarSOS can use useNavigate()
        and Link components work throughout.
      */}
      <BrowserRouter>
        <nav style={styles.navbar}>
          <Link to="/social/feed" style={styles.logo}>
            SheVerse
          </Link>

          {/* Section dropdowns */}
          <div style={styles.navCenter}>
            {NAV.map((section) => (
              <div
                key={section.section}
                style={styles.navItem}
                onMouseEnter={() => setMenuOpen(section.section)}
                onMouseLeave={() => setMenuOpen(null)}
              >
                <span style={styles.navLabel}>{section.section}</span>

                {menuOpen === section.section && (
                  <div style={styles.dropdown}>
                    <p style={styles.dropdownTitle}>
                      {section.section.toUpperCase()}
                    </p>
                    {section.links.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        style={styles.dropdownLink}
                        onClick={() => {
                          if (link.path === "/social/profile") setProfileViewId(null);
                          setMenuOpen(null);
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f3e8ff")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right side: bell + SOS + greeting + sign out */}
          <div style={styles.navRight}>
            {/* NavbarSOS is inside BrowserRouter so useNavigate works */}
            <NavbarSOS token={token} />
            <span style={styles.greeting}>{user.name}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </nav>

        <Routes>
          {/* Travel */}
          <Route path="/travel/places"      element={<PlacesPage />} />
          <Route path="/travel/trips"       element={<TripPage />} />
          <Route path="/travel/guides"      element={<GuidePage />} />
          <Route path="/travel/hotels"      element={<HotelPage />} />
          <Route path="/travel/marketplace" element={<MarketplacePage />} />

          {/* Safety */}
          <Route path="/safety/sos"             element={<SOSPage />} />
          <Route path="/safety/incoming-alerts" element={<IncomingAlertsPage />} />
          <Route path="/safety/contacts"        element={<TrustedContactsPage />} />
          <Route path="/safety/location"        element={<LiveLocationPage />} />
          <Route path="/safety/emergency"       element={<EmergencyServicesPage />} />
          <Route path="/safety/report"          element={<IncidentReportPage />} />

          {/* Health */}
          <Route path="/health/menstrual" element={<MenstrualTracker />} />
          <Route path="/health/lifestyle" element={<LifestylePage />} />
          <Route path="/health/articles"  element={<ArticlesPage />} />
          <Route path="/health/exercise"  element={<ExercisePage />} />
          <Route path="/health/ai-bot"    element={<AIBotPage />} />

          {/* Social */}
          <Route path="/social/feed"    element={<PostPage />} />
          <Route path="/social/groups"  element={<GroupPage />} />
          <Route
            path="/social/profile"
            element={
              <ProfilePage
                viewUserId={profileViewId}
                onViewProfile={(uid) => setProfileViewId(uid || null)}
              />
            }
          />
          <Route path="/social/chat" element={<MessagePage />} />
          <Route path="*" element={<Navigate to="/social/feed" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  app: { minHeight: "100vh", fontFamily: "'Georgia', serif" },
  navbar: {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    padding: "0 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 20px rgba(157,107,157,0.12)",
    borderBottom: "1px solid #f3e8ff",
    height: 60,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    color: "#7c3aed",
    fontWeight: 400,
    fontSize: 20,
    letterSpacing: 3,
    fontFamily: "'Georgia', serif",
    textDecoration: "none",
  },
  navCenter: { display: "flex", gap: 8, alignItems: "center" },
  navItem: {
    position: "relative",
    padding: "0 16px",
    height: 60,
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },
  navLabel: {
    fontSize: 14,
    letterSpacing: 2,
    color: "#7c3aed",
    fontFamily: "sans-serif",
    fontWeight: 500,
  },
  dropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    background: "#ffffff",
    borderRadius: "0 0 14px 14px",
    boxShadow: "0 20px 40px rgba(157,107,157,0.2)",
    border: "1px solid #f3e8ff",
    borderTop: "none",
    minWidth: 200,
    padding: "8px 0",
    zIndex: 200,
  },
  dropdownTitle: {
    fontSize: 9,
    letterSpacing: 3,
    color: "#c084c4",
    fontFamily: "sans-serif",
    padding: "8px 20px 4px",
    margin: 0,
  },
  dropdownLink: {
    display: "block",
    padding: "10px 20px",
    fontSize: 13,
    color: "#3b0764",
    textDecoration: "none",
    fontFamily: "sans-serif",
    transition: "background 0.2s",
    letterSpacing: 0.5,
  },
  navRight: { display: "flex", gap: 12, alignItems: "center" },
  greeting: {
    color: "#9d6b9d",
    fontSize: 13,
    fontFamily: "sans-serif",
    letterSpacing: 1,
  },
  logoutBtn: {
    background: "transparent",
    color: "#9d4edd",
    border: "1px solid #e9d5ff",
    borderRadius: 20,
    padding: "7px 20px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "sans-serif",
    letterSpacing: 2,
    transition: "all 0.2s",
  },
};

export default App;