import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api/trips";
const PLACES_API = "http://localhost:5000/api/places";
const CATEGORIES = [];
const TRAVEL_TYPES = ["solo", "group"];

export default function TripPage() {
  const location = useLocation();

  const savedPlan = JSON.parse(localStorage.getItem("planTrip") || "{}");

  const [allTrips, setAllTrips]           = useState([]);
  const [myTrips, setMyTrips]             = useState([]);
  const [pendingPlans, setPendingPlans]   = useState([]);
  const [form, setForm]                   = useState({
    destination: savedPlan.destination || "",
    category:    savedPlan.category    || "beach",
    startDate: "", endDate: "", budget: "",
    travelType: "solo", teamSize: 1, preferences: ""
  });
  const [loading, setLoading]             = useState(false);
  const [recommendations, setRecs]        = useState([]);
  const [requests, setRequests]           = useState([]);
  const [selectedTrip, setSelectedTrip]   = useState(null);
  const [activeTab, setActiveTab]         = useState("browse");
  const [joinedTrips, setJoinedTrips]     = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [categories, setCategories]       = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Check if navigated from Places with ?tab=plan
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "plan") {
      setActiveTab("plan");
      if (savedPlan.destination) {
        fetchRecommendations(savedPlan.destination);
      }
    }
  }, [location]);

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

  const fetchPendingPlans = async () => {
    try {
      const { data } = await axios.get(`${API}/pending/${user._id}`);
      setPendingPlans(data);
    } catch (err) { console.error(err); }
  };

  const fetchRecommendations = async (destination) => {
    if (!destination) return;
    try {
      const { data } = await axios.get(`${API}/recommendations/${destination}`);
      setRecs(data);
    } catch (err) { console.error(err); }
  };

  const fetchDestSuggestions = async (search) => {
    if (!search || search.length < 2) { setDestSuggestions([]); return; }
    try {
      const { data } = await axios.get(`${PLACES_API}/all?search=${search}`);
      // Group by city to avoid duplicate cities
      const cities = [];
      const seen = new Set();
      data.forEach(p => {
        if (!seen.has(p.city)) {
          seen.add(p.city);
          cities.push({ city: p.city, category: p.category, name: p.name });
        }
      });
      setDestSuggestions(cities);
      setShowDropdown(true);
    } catch (err) { console.error(err); }
  };

  
  const fetchCategories = async () => {
  try {
    const { data } = await axios.get(`${PLACES_API}/all`);
    const unique = [...new Set(data.map(p => p.category).filter(Boolean))];
    setCategories(unique);
  } catch (err) { console.error(err); }
};




  const fetchRequests = async (tripId) => {
    try {
      const { data } = await axios.get(`${API}/${tripId}/requests`);
      setRequests(data);
      setSelectedTrip(tripId);
    } catch (err) { console.error(err); }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await axios.patch(`${API}/requests/${requestId}/status`, { status });
      setRequests(prev => prev.map(r =>
        r._id === requestId ? { ...r, status } : r
      ));
    } catch (err) { console.error(err); }
  };

  const handleJoin = async (tripId) => {
    if (joinedTrips.includes(tripId)) {
      alert("You have already requested to join this trip!");
      return;
    }
    try {
      await axios.post(`${API}/${tripId}/join`, { userId: user._id });
      setJoinedTrips([...joinedTrips, tripId]);
      alert("✅ Join request sent successfully!");
      fetchPendingPlans();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send request!");
    }
  };

  const handleCancel = async (tripId) => {
    if (!window.confirm("Are you sure you want to cancel this trip?")) return;
    try {
      await axios.delete(`${API}/${tripId}`);
      fetchTrips();
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async () => {
    if (!form.destination || !form.startDate || !form.endDate || !form.budget) {
      alert("Please fill all required fields!");
      return;
    }
    try {
      const { data } = await axios.post(`${API}/create`, { ...form, userId: user._id });
      alert(`Trip created! ${data.matchesFound} potential matches found.`);
      setForm({ destination: "", category: "beach", startDate: "", endDate: "", budget: "", travelType: "solo", teamSize: 1, preferences: "" });
      setRecs([]);
      localStorage.removeItem("planTrip");
      setActiveTab("mine");
      fetchTrips();
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTrips(); fetchCategories();}, []);
  useEffect(() => { if (activeTab === "pending") fetchPendingPlans(); }, [activeTab]);

  // ── Browse Card ──
  const BrowseCard = ({ trip }) => (
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
        <div style={S.postedByRow}>
          <div style={S.postedAvatar}>{trip.userId.name[0]}</div>
          <p style={S.postedBy}>Posted by <strong>{trip.userId.name}</strong></p>
        </div>
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
      <button
        style={{ ...S.joinBtn, ...(joinedTrips.includes(trip._id) ? S.joinedBtn : {}) }}
        onClick={() => handleJoin(trip._id)}
        disabled={joinedTrips.includes(trip._id)}
      >
        {joinedTrips.includes(trip._id) ? "Request Sent ✓" : "Request to Join"}
      </button>
    </div>
  );

  // ── My Trip Card ──
  const MyTripCard = ({ trip }) => (
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
        <button style={S.matchBtn} onClick={() => fetchRequests(trip._id)}>
          Find Companions
        </button>
        <button style={S.cancelBtn} onClick={() => handleCancel(trip._id)}>
          Cancel Trip
        </button>
      </div>

      {selectedTrip === trip._id && (
        <div style={S.matchPanel}>
          <p style={S.matchTitle}>COMPANION REQUESTS</p>
          {requests.length === 0 ? (
            <p style={S.noMatch}>No requests yet.</p>
          ) : (
            requests.map(r => (
              <div key={r._id} style={S.matchCard}>
                <div style={S.matchAvatar}>{r.userId?.name?.[0] || "?"}</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14, color: "#3b0764" }}>
                    {r.userId?.name || "Anonymous"}
                  </strong>
                  <p style={{ fontSize: 12, color: "#9d6b9d", margin: "2px 0" }}>
                    {r.userId?.email}
                  </p>
                </div>
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={S.acceptBtn} onClick={() => handleStatusUpdate(r._id, "accepted")}>Accept</button>
                    <button style={S.rejectBtn} onClick={() => handleStatusUpdate(r._id, "rejected")}>Reject</button>
                  </div>
                )}
                {r.status === "accepted" && <span style={S.acceptedBadge}>Accepted ✓</span>}
                {r.status === "rejected" && <span style={S.rejectedBadge}>Rejected</span>}
              </div>
            ))
          )}
          <button style={S.closeSmall} onClick={() => setSelectedTrip(null)}>Close</button>
        </div>
      )}
    </div>
  );

  // ── Pending Plan Card ──
  const PendingCard = ({ request }) => {
    const trip = request.tripId;
    const status = request.status;
    const statusStyle = {
      pending:  { bg: "#fef3c7", color: "#92400e", text: "Awaiting Approval" },
      accepted: { bg: "#d1fae5", color: "#065f46", text: "Accepted!" },
      rejected: { bg: "#fee2e2", color: "#991b1b", text: "Request Rejected" },
    }[status] || { bg: "#f3f4f6", color: "#6b7280", text: status };

    return (
      <div style={S.pendingCard}>
        <div style={S.cardTop}>
          <div>
            <p style={S.cardCategory}>{trip?.category?.toUpperCase()}</p>
            <h3 style={S.cardTitle}>{trip?.destination}</h3>
          </div>
          <div style={{ background: statusStyle.bg, color: statusStyle.color, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", fontWeight: 600 }}>
            {statusStyle.text}
          </div>
        </div>
        <div style={S.divider} />
        {trip?.userId?.name && (
          <p style={S.postedBy}>Trip by <strong>{trip.userId.name}</strong></p>
        )}
        <div style={S.infoGrid}>
          <div style={S.infoItem}>
            <p style={S.infoLabel}>DATES</p>
            <p style={S.infoValue}>
              {trip?.startDate && new Date(trip.startDate).toLocaleDateString()} — {trip?.endDate && new Date(trip.endDate).toLocaleDateString()}
            </p>
          </div>
          <div style={S.infoItem}>
            <p style={S.infoLabel}>BUDGET</p>
            <p style={S.infoValue}>৳ {trip?.budget?.toLocaleString()}</p>
          </div>
          <div style={S.infoItem}>
            <p style={S.infoLabel}>GROUP SIZE</p>
            <p style={S.infoValue}>{trip?.teamSize} {trip?.teamSize === 1 ? "Person" : "People"}</p>
          </div>
          <div style={S.infoItem}>
            <p style={S.infoLabel}>TRAVEL TYPE</p>
            <p style={S.infoValue}>{trip?.travelType}</p>
          </div>
        </div>
        {status === "accepted" && (
          <button style={S.payBtn} onClick={() => alert("💳 Stripe payment coming soon! Your spot is reserved.")}>
            Proceed to Payment
          </button>
        )}
        {status === "rejected" && (
          <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "sans-serif", textAlign: "center", marginTop: 8 }}>
            This request was not accepted. Browse other trips!
          </p>
        )}
      </div>
    );
  };

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
            { key: "browse",  label: "Browse Trips" },
            { key: "mine",    label: "My Trips" },
            { key: "pending", label: "Pending Plans" },
            { key: "plan",    label: "Plan a Trip" },
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
                {allTrips.map(t => <BrowseCard key={t._id} trip={t} />)}
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
                {myTrips.map(t => <MyTripCard key={t._id} trip={t} />)}
              </div>
            )}
          </div>
        )}

        {/* Pending Plans */}
        {activeTab === "pending" && (
          <div>
            <p style={S.sectionSub}>Trips you have requested to join</p>
            {pendingPlans.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.empty}>No pending plans yet.</p>
                <button style={S.matchBtn} onClick={() => setActiveTab("browse")}>Browse Trips</button>
              </div>
            ) : (
              <div style={S.grid}>
                {pendingPlans.map(r => <PendingCard key={r._id} request={r} />)}
              </div>
            )}
          </div>
        )}

        {/* Plan a Trip */}
        {activeTab === "plan" && (
          <div style={S.formWrap}>
            <p style={S.sectionSub}>Fill in your travel details</p>
            <div style={S.formCard}>

              <div style={S.formRow}>
                {/* Destination with dropdown */}
                <div style={S.formGroup}>
                  <label style={S.label}>DESTINATION</label>
                  <div style={{ position: "relative" }}>
                    <input
                      style={S.input}
                      placeholder="Search destination..."
                      value={form.destination}
                      onChange={(e) => {
                        setForm({ ...form, destination: e.target.value });
                        fetchDestSuggestions(e.target.value);
                        fetchRecommendations(e.target.value);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      onFocus={() => form.destination.length > 1 && setShowDropdown(true)}
                    />
                    {showDropdown && destSuggestions.length > 0 && (
                      <div style={S.dropdown}>
                        {destSuggestions.map((s, i) => (
                          <div
                            key={i}
                            style={S.dropdownItem}
                            onMouseDown={() => {
                              setForm({ ...form, destination: s.city, category: s.category });
                              fetchRecommendations(s.city);
                              setShowDropdown(false);
                              localStorage.removeItem("planTrip");
                            }}
                          >
                            <strong style={{ fontSize: 13, color: "#3b0764" }}>{s.city}</strong>
                            <span style={{ fontSize: 11, color: "#c084c4", marginLeft: 8 }}>via {s.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={S.formGroup}>
                  <label style={S.label}>CATEGORY</label>
                  <select style={S.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
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
  wrapper:       { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:            { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/7150075/pexels-photo-7150075.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(0.5px)", transform: "scale(1.1)", zIndex: -2 },
  overlay:       { position: "fixed", inset: 0, background: "rgba(255,245,250,0.78)", zIndex: -1 },
  page:          { maxWidth: 1100, margin: "auto", padding: "40px 24px" },

  header:        { textAlign: "center", marginBottom: 40 },
  headerSub:     { fontSize: 11, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:   { fontSize: 36, fontWeight: 400, color: "#4a2060", margin: "0 0 16px", letterSpacing: 1 },
  headerDivider: { width: 60, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto" },

  tabs:          { display: "flex", gap: 0, justifyContent: "center", marginBottom: 36, border: "1px solid #e2c4e2", borderRadius: 30, overflow: "hidden", maxWidth: 560, margin: "0 auto 36px" },
  tab:           { flex: 1, padding: "11px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1 },
  tabActive:     { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff" },

  sectionSub:    { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", marginBottom: 24, letterSpacing: 1 },
  loading:       { textAlign: "center", color: "#9d6b9d", letterSpacing: 2, fontFamily: "sans-serif" },
  empty:         { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif" },
  emptyBox:      { textAlign: "center", padding: 40 },

  grid:          { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 24 },
  card:          { background: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(157,107,157,0.12)", backdropFilter: "blur(.80px)" },
  pendingCard:   { background: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(157,107,157,0.12)", backdropFilter: "blur(.80px)" },
  cardTop:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardCategory:  { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  cardTitle:     { fontSize: 20, fontWeight: 400, color: "#3b0764", margin: 0, letterSpacing: 0.5 },
  badge:         { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  badgeSolo:     { background: "#f3e8ff", color: "#7c3aed" },
  badgeGroup:    { background: "#fce7f3", color: "#be185d" },
  divider:       { height: 1, background: "#f3e8ff", margin: "12px 0" },

  postedByRow:   { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  postedAvatar:  { width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 },
  postedBy:      { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", margin: 0 },

  infoGrid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 },
  infoItem:      { background: "#faf5ff", borderRadius: 10, padding: "10px 12px" },
  infoLabel:     { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 4px" },
  infoValue:     { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", margin: 0 },

  btnRow:        { display: "flex", gap: 10 },
  matchBtn:      { flex: 1, padding: "10px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  joinBtn:       { width: "100%", padding: "10px", background: "transparent", border: "1px solid #9d4edd", color: "#9d4edd", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  joinedBtn:     { background: "#f3e8ff", color: "#c084c4", border: "1px solid #e9d5ff", cursor: "not-allowed" },
  cancelBtn:     { flex: 1, padding: "10px", background: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  payBtn:        { width: "100%", padding: "12px", background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 1, marginTop: 8 },

  matchPanel:    { marginTop: 16, padding: 16, background: "#faf5ff", borderRadius: 12, border: "1px solid #e9d5ff" },
  matchTitle:    { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 12 },
  noMatch:       { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif" },
  matchCard:     { display: "flex", gap: 12, padding: 10, background: "#fff", borderRadius: 10, marginBottom: 8, alignItems: "center" },
  matchAvatar:   { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#9d4edd,#c77dff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 16, flexShrink: 0 },

  acceptBtn:     { padding: "6px 14px", background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif" },
  rejectBtn:     { padding: "6px 14px", background: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif" },
  acceptedBadge: { background: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: 10, fontSize: 11, fontFamily: "sans-serif", whiteSpace: "nowrap" },
  rejectedBadge: { background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: 10, fontSize: 11, fontFamily: "sans-serif", whiteSpace: "nowrap" },
  closeSmall:    { marginTop: 10, padding: "6px 16px", background: "transparent", border: "1px solid #e2c4e2", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d" },

  formWrap:      { maxWidth: 700, margin: "0 auto" },
  formCard:      { background: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 32, boxShadow: "0 4px 20px rgba(157,107,157,0.12)" },
  formRow:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  formGroup:     { display: "flex", flexDirection: "column", gap: 6 },
  label:         { fontSize: 10, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif" },
  input:         { padding: "11px 14px", border: "1px solid #e2c4e2", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "sans-serif", background: "rgba(255,255,255,0.9)", width: "100%", boxSizing: "border-box" },
  submitBtn:     { width: "100%", padding: 14, background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, marginTop: 8 },

  dropdown:      { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2c4e2", borderRadius: 10, boxShadow: "0 8px 24px rgba(157,107,157,0.15)", zIndex: 100, maxHeight: 200, overflowY: "auto" },
  dropdownItem:  { padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f3e8ff" },

  recBox:        { marginTop: 28, padding: 24, background: "rgba(255,255,255,0.88)", borderRadius: 16, boxShadow: "0 4px 20px rgba(157,107,157,0.12)" },
  recTitle:      { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 16 },
  recGrid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 },
  recCard:       { border: "1px solid #e9d5ff", borderRadius: 12, overflow: "hidden", background: "#fff" },
  recImg:        { width: "100%", height: 80, objectFit: "cover" },
  recPlaceholder:{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#e9d5ff,#fce7f3)", fontSize: 28, color: "#9d4edd" },
};