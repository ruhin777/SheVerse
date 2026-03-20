import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/trips";
const CATEGORIES = ["beach", "hill", "historical", "park", "other"];
const TRAVEL_TYPES = ["solo", "group"];

export default function TripPage() {
  const [allTrips, setAllTrips]         = useState([]);
  const [myTrips, setMyTrips]           = useState([]);
  const [form, setForm]                 = useState({ destination: "", category: "beach", startDate: "", endDate: "", budget: "", travelType: "solo", teamSize: 1, preferences: "" });
  const [loading, setLoading]           = useState(false);
  const [recommendations, setRecs]      = useState([]);
  const [matches, setMatches]           = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab]       = useState("browse");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/all`);
      setMyTrips(data.filter(t => t.userId?._id === user._id || t.userId === user._id));
      setAllTrips(data.filter(t => t.userId?._id !== user._id && t.userId !== user._id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (destination) => {
    if (!destination) return;
    try {
      const { data } = await axios.get(`${API}/recommendations/${destination}`);
      setRecs(data);
    } catch (err) { console.error(err); }
  };

  const fetchMatches = async (tripId) => {
    try {
      const { data } = await axios.get(`${API}/matches/${tripId}`);
      setMatches(data);
      setSelectedTrip(tripId);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async () => {
    if (!form.destination || !form.startDate || !form.endDate || !form.budget) {
      alert("Please fill all required fields!");
      return;
    }
    try {
      const { data } = await axios.post(`${API}/create`, { ...form, userId: user._id });
      alert(`Trip created successfully! ${data.matchesFound} potential matches found.`);
      setForm({ destination: "", category: "beach", startDate: "", endDate: "", budget: "", travelType: "solo", teamSize: 1, preferences: "" });
      setRecs([]);
      setActiveTab("mine");
      fetchTrips();
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTrips(); }, []);

  const TripCard = ({ trip, isOwn }) => (
    <div style={S.card}>
      <div style={S.cardTop}>
        <div>
          <p style={S.cardCategory}>{trip.category?.toUpperCase()}</p>
          <h3 style={S.cardTitle}>{trip.destination}</h3>
        </div>
        <span style={{ ...S.badge, ...(trip.travelType === "solo" ? S.badgeSolo : S.badgeGroup) }}>
          {trip.travelType}
        </span>
      </div>

      <div style={S.divider} />

      {trip.userId?.name && (
        <p style={S.postedBy}>Posted by <strong>{trip.userId.name}</strong></p>
      )}

      <div style={S.infoGrid}>
        <div style={S.infoItem}>
          <p style={S.infoLabel}>DATES</p>
          <p style={S.infoValue}>{new Date(trip.startDate).toLocaleDateString()} — {new Date(trip.endDate).toLocaleDateString()}</p>
        </div>
        <div style={S.infoItem}>
          <p style={S.infoLabel}>BUDGET</p>
          <p style={S.infoValue}>৳ {trip.budget?.toLocaleString()}</p>
        </div>
        <div style={S.infoItem}>
          <p style={S.infoLabel}>GROUP SIZE</p>
          <p style={S.infoValue}>{trip.teamSize} {trip.teamSize === 1 ? "Person" : "People"}</p>
        </div>
        {trip.preferences && (
          <div style={S.infoItem}>
            <p style={S.infoLabel}>PREFERENCES</p>
            <p style={S.infoValue}>{trip.preferences}</p>
          </div>
        )}
      </div>

      <div style={S.btnRow}>
        <button style={S.matchBtn} onClick={() => fetchMatches(trip._id)}>
          Find Companions
        </button>
        {!isOwn && (
          <button style={S.joinBtn} onClick={() => alert("Join request sent!")}>
            Request to Join
          </button>
        )}
      </div>

      {selectedTrip === trip._id && (
        <div style={S.matchPanel}>
          <p style={S.matchTitle}>POTENTIAL COMPANIONS</p>
          {matches.length === 0 ? (
            <p style={S.noMatch}>No matches found yet. Share your trip!</p>
          ) : (
            matches.map(m => (
              <div key={m._id} style={S.matchCard}>
                <div style={S.matchAvatar}>{m.matchedUserId?.name?.[0] || "?"}</div>
                <div>
                  <strong style={{ fontSize: 14, color: "#3b0764" }}>{m.matchedUserId?.name || "Anonymous"}</strong>
                  <p style={{ fontSize: 12, color: "#9d6b9d", margin: "2px 0" }}>{m.matchedUserId?.bio || "No bio provided"}</p>
                </div>
              </div>
            ))
          )}
          <button style={S.closeSmall} onClick={() => setSelectedTrip(null)}>Close</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.headerSub}>TRAVEL & CONNECT</p>
          <h1 style={S.headerTitle}>Trip Planner</h1>
          <div style={S.headerDivider} />
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {[
            { key: "browse", label: "Browse Trips" },
            { key: "mine",   label: "My Trips" },
            { key: "plan",   label: "Plan a Trip" },
          ].map(tab => (
            <button
              key={tab.key}
              style={{ ...S.tab, ...(activeTab === tab.key ? S.tabActive : {}) }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browse */}
        {activeTab === "browse" && (
          <div>
            <p style={S.sectionSub}>Discover trips planned by other travelers</p>
            {loading ? <p style={S.loading}>Loading...</p> :
              allTrips.length === 0 ? <p style={S.empty}>No trips available yet.</p> :
              <div style={S.grid}>
                {allTrips.map(t => <TripCard key={t._id} trip={t} isOwn={false} />)}
              </div>
            }
          </div>
        )}

        {/* My Trips */}
        {activeTab === "mine" && (
          <div>
            <p style={S.sectionSub}>Your personal travel plans</p>
            {myTrips.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.empty}>You have no trips planned yet.</p>
                <button style={S.matchBtn} onClick={() => setActiveTab("plan")}>Plan Your First Trip</button>
              </div>
            ) : (
              <div style={S.grid}>
                {myTrips.map(t => <TripCard key={t._id} trip={t} isOwn={true} />)}
              </div>
            )}
          </div>
        )}

        {/* Plan */}
        {activeTab === "plan" && (
          <div style={S.formWrap}>
            <p style={S.sectionSub}>Fill in your travel details</p>
            <div style={S.formCard}>

              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>DESTINATION</label>
                  <input style={S.input} placeholder="e.g. Cox's Bazar" value={form.destination}
                    onChange={(e) => { setForm({ ...form, destination: e.target.value }); fetchRecommendations(e.target.value); }} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>CATEGORY</label>
                  <select style={S.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>START DATE</label>
                  <input style={S.input} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>END DATE</label>
                  <input style={S.input} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>

              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>BUDGET (৳)</label>
                  <input style={S.input} type="number" placeholder="5000" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>TRAVEL TYPE</label>
                  <select style={S.input} value={form.travelType} onChange={(e) => setForm({ ...form, travelType: e.target.value })}>
                    {TRAVEL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>GROUP SIZE</label>
                  <input style={S.input} type="number" min="1" max="20" value={form.teamSize} onChange={(e) => setForm({ ...form, teamSize: e.target.value })} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>PREFERENCES</label>
                  <input style={S.input} placeholder="e.g. photography, trekking" value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} />
                </div>
              </div>

              <button style={S.submitBtn} onClick={handleSubmit}>Create Trip Plan</button>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div style={S.recBox}>
                <p style={S.recTitle}>RECOMMENDED PLACES</p>
                <div style={S.recGrid}>
                  {recommendations.map(p => (
                    <div key={p._id} style={S.recCard}>
                      {p.image
                        ? <img src={p.image} alt={p.name} style={S.recImg} />
                        : <div style={S.recPlaceholder}>{p.name[0]}</div>
                      }
                      <div style={{ padding: "10px 12px" }}>
                        <strong style={{ fontSize: 13, color: "#3b0764" }}>{p.name}</strong>
                        <p style={{ fontSize: 11, color: "#9d6b9d", margin: "3px 0" }}>★ {p.rating} · {p.city}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  wrapper:      { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:           { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/7150075/pexels-photo-7150075.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(0.5px)", transform: "scale(1.1)", zIndex: -2 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(255,245,250,0.78)", zIndex: -1 },
  page:         { maxWidth: 1100, margin: "auto", padding: "40px 24px" },

  header:       { textAlign: "center", marginBottom: 40 },
  headerSub:    { fontSize: 11, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:  { fontSize: 36, fontWeight: 400, color: "#4a2060", margin: "0 0 16px", letterSpacing: 1 },
  headerDivider:{ width: 60, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto" },

  tabs:         { display: "flex", gap: 0, justifyContent: "center", marginBottom: 36, border: "1px solid #e2c4e2", borderRadius: 30, overflow: "hidden", maxWidth: 420, margin: "0 auto 36px" },
  tab:          { flex: 1, padding: "11px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1 },
  tabActive:    { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff" },

  sectionSub:   { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", marginBottom: 24, letterSpacing: 1 },
  loading:      { textAlign: "center", color: "#9d6b9d", letterSpacing: 2, fontFamily: "sans-serif" },
  empty:        { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif" },
  emptyBox:     { textAlign: "center", padding: 40 },

  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 24 },

  card:         { background: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(157,107,157,0.12)", backdropFilter: "blur(.80px)" },
  cardTop:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardCategory: { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  cardTitle:    { fontSize: 20, fontWeight: 400, color: "#3b0764", margin: 0, letterSpacing: 0.5 },
  badge:        { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  badgeSolo:    { background: "#f3e8ff", color: "#7c3aed" },
  badgeGroup:   { background: "#fce7f3", color: "#be185d" },
  divider:      { height: 1, background: "#f3e8ff", margin: "12px 0" },
  postedBy:     { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 12 },

  infoGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 },
  infoItem:     { background: "#faf5ff", borderRadius: 10, padding: "10px 12px" },
  infoLabel:    { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 4px" },
  infoValue:    { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", margin: 0 },

  btnRow:       { display: "flex", gap: 10 },
  matchBtn:     { flex: 1, padding: "10px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  joinBtn:      { flex: 1, padding: "10px", background: "transparent", border: "1px solid #9d4edd", color: "#9d4edd", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },

  matchPanel:   { marginTop: 16, padding: 16, background: "#faf5ff", borderRadius: 12, border: "1px solid #e9d5ff" },
  matchTitle:   { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 12 },
  noMatch:      { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif" },
  matchCard:    { display: "flex", gap: 12, padding: 10, background: "#fff", borderRadius: 10, marginBottom: 8, alignItems: "center" },
  matchAvatar:  { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#9d4edd,#c77dff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 16 },
  closeSmall:   { marginTop: 10, padding: "6px 16px", background: "transparent", border: "1px solid #e2c4e2", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d" },

  formWrap:     { maxWidth: 700, margin: "0 auto" },
  formCard:     { background: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 32, boxShadow: "0 4px 20px rgba(157,107,157,0.12)" },
  formRow:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  formGroup:    { display: "flex", flexDirection: "column", gap: 6 },
  label:        { fontSize: 10, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif" },
  input:        { padding: "11px 14px", border: "1px solid #e2c4e2", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "sans-serif", background: "rgba(255,255,255,0.9)" },
  submitBtn:    { width: "100%", padding: 14, background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, marginTop: 8 },

  recBox:       { marginTop: 28, padding: 24, background: "rgba(255,255,255,0.88)", borderRadius: 16, boxShadow: "0 4px 20px rgba(157,107,157,0.12)" },
  recTitle:     { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 16 },
  recGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 },
  recCard:      { border: "1px solid #e9d5ff", borderRadius: 12, overflow: "hidden", background: "#fff" },
  recImg:       { width: "100%", height: 80, objectFit: "cover" },
  recPlaceholder:{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#e9d5ff,#fce7f3)", fontSize: 28, color: "#9d4edd" },
};