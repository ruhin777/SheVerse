import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";

// ── Existing Pages (Travel Module) ──
import PlacesPage from "./pages/PlacesPage";
import TripPage from "./pages/TripPage";
import AuthPage from "./pages/AuthPage";

// ── TODO: Team members import their pages here ──
// import SOSPage from "./pages/safety/SOSPage";
// import LiveLocationPage from "./pages/safety/LiveLocationPage";
// import IncidentReportPage from "./pages/safety/IncidentReportPage";
// import EmergencyServicesPage from "./pages/safety/EmergencyServicesPage";
// import MenstrualTrackerPage from "./pages/health/MenstrualTrackerPage";
// import LifestylePage from "./pages/health/LifestylePage";
// import ArticlesPage from "./pages/health/ArticlesPage";
// import ExercisePage from "./pages/health/ExercisePage";
// import AIChatPage from "./pages/health/AIChatPage";
import GuidePage from "./pages/GuidePage";
import HotelPage from "./pages/HotelPage";
import MarketplacePage from "./pages/MarketplacePage";
import PostPage from "./pages/PostPage"; // ── ADDED for Social Feed
// import GroupsPage from "./pages/social/GroupsPage";
// import ProfilePage from "./pages/social/ProfilePage";
// import ChatPage from "./pages/social/ChatPage";

// ── Nav Structure ──
const NAV = [
  {
    section: "Safety",
    links: [
      { label: "SOS Alert",          path: "/safety/sos" },
      { label: "Live Location",       path: "/safety/location" },
      { label: "Emergency Services",  path: "/safety/emergency" },
      { label: "Report Incident",     path: "/safety/report" },
    ]
  },
  {
    section: "Health",
    links: [
      { label: "Menstrual Tracker",   path: "/health/menstrual" },
      { label: "Lifestyle & BMI",     path: "/health/lifestyle" },
      { label: "Articles & Tips",     path: "/health/articles" },
      { label: "Exercise Guidance",   path: "/health/exercise" },
      { label: "AI Health Bot",       path: "/health/ai-bot" },
    ]
  },
  {
    section: "Travel",
    links: [
      { label: "Explore Places",      path: "/travel/places" },
      { label: "Trip Planning",       path: "/travel/trips" },
      { label: "Female Guides",       path: "/travel/guides" },
      { label: "Hotel Booking",       path: "/travel/hotels" },
      { label: "Marketplace",         path: "/travel/marketplace" },
    ]
  },
  {
    section: "Social",
    links: [
      { label: "Community Feed",      path: "/social/feed" },
      { label: "Groups",              path: "/social/groups" },
      { label: "My Profile",          path: "/social/profile" },
      { label: "Messages",            path: "/social/chat" },
    ]
  },
];

// ── Placeholder for unbuilt pages ──
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
  title: { fontSize: 28, fontWeight: 400, color: "#3b0764", fontFamily: "Georgia, serif", margin: "0 0 16px" },
  line:  { width: 40, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 20px" },
  desc:  { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.8 },
};

// ── Main App ──
function App() {
  const [user, setUser]         = useState(null);
  const [menuOpen, setMenuOpen] = useState(null); // which dropdown is open

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin  = (userData) => setUser(userData);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div style={styles.app}>
      <BrowserRouter>

        {/* ── Navbar ── */}
        <nav style={styles.navbar}>

          {/* Logo */}
          <Link to="/travel/places" style={styles.logo}>
            SheVerse
          </Link>

          {/* Nav Links with Dropdowns */}
          <div style={styles.navCenter}>
            {NAV.map((section) => (
              <div
                key={section.section}
                style={styles.navItem}
                onMouseEnter={() => setMenuOpen(section.section)}
                onMouseLeave={() => setMenuOpen(null)}
              >
                <span style={styles.navLabel}>{section.section}</span>

                {/* Dropdown */}
                {menuOpen === section.section && (
                  <div style={styles.dropdown}>
                    <p style={styles.dropdownTitle}>{section.section.toUpperCase()}</p>
                    {section.links.map(link => (
                      <Link
                        key={link.path}
                        to={link.path}
                        style={styles.dropdownLink}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f3e8ff"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User */}
          <div style={styles.navRight}>
            <span style={styles.greeting}>{user.name}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
          </div>
        </nav>

        {/* ── Routes ── */}
        <Routes>

          {/* Travel — Built */}
          <Route path="/travel/places"      element={<PlacesPage />} />
          <Route path="/travel/trips"       element={<TripPage />} />

          {/* Travel — TODO */}
          <Route path="/travel/guides"      element={<GuidePage />} />
          <Route path="/travel/hotels"      element={<HotelPage />} />
          <Route path="/travel/marketplace" element={<MarketplacePage />} />

          {/* Safety — TODO */}
          <Route path="/safety/sos"         element={<ComingSoon title="SOS Alert" />} />
          <Route path="/safety/location"    element={<ComingSoon title="Live Location Sharing" />} />
          <Route path="/safety/emergency"   element={<ComingSoon title="Emergency Services" />} />
          <Route path="/safety/report"      element={<ComingSoon title="Incident Reporting" />} />

          {/* Health — TODO */}
          <Route path="/health/menstrual"   element={<ComingSoon title="Menstrual Tracker" />} />
          <Route path="/health/lifestyle"   element={<ComingSoon title="Lifestyle & BMI" />} />
          <Route path="/health/articles"    element={<ComingSoon title="Health Articles" />} />
          <Route path="/health/exercise"    element={<ComingSoon title="Exercise Guidance" />} />
          <Route path="/health/ai-bot"      element={<ComingSoon title="AI Health Bot" />} />

          {/* Social — TODO */}
          <Route path="/social/feed"        element={<PostPage />} /> {/* ── UPDATED to use PostPage */}
          <Route path="/social/groups"      element={<ComingSoon title="Interest Groups" />} />
          <Route path="/social/profile"     element={<ComingSoon title="My Profile" />} />
          <Route path="/social/chat"        element={<ComingSoon title="Messages" />} />

          {/* Default */}
          <Route path="*" element={<Navigate to="/travel/places" />} />
        </Routes>

      </BrowserRouter>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    fontFamily: "'Georgia', serif",
  },

  // Navbar
  navbar: {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    padding: "0 40px",
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

  navCenter: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },

  navItem: {
    position: "relative",
    padding: "0 16px",
    height: 60,
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },

  navLabel: {
    fontSize: 12,
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

  navRight: {
    display: "flex",
    gap: 16,
    alignItems: "center",
  },

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
