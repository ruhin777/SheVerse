import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/guides";
const DESTINATIONS = ["All", "Cox's Bazar", "Sajek Valley", "Bandarban", "Sundarbans", "Dhaka", "Rangamati", "Sylhet"];

export default function GuidePage() {
  const [guides, setGuides]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [destination, setDest]      = useState("All");
  const [selected, setSelected]     = useState(null); // selected guide for booking
  const [bookingDate, setBookDate]  = useState("");
  const [bookings, setBookings]     = useState([]);
  const [activeTab, setActiveTab]   = useState("browse");
  const [success, setSuccess]       = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const params = {};
      if (destination !== "All") params.destination = destination;
      const { data } = await axios.get(`${API}/all`, { params });
      setGuides(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await axios.get(`${API}/bookings/${user._id}`);
      setBookings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBook = async () => {
    if (!bookingDate) { alert("Please select a booking date!"); return; }
    try {
      await axios.post(`${API}/book`, {
        userId: user._id,
        guideId: selected._id,
        bookingDate,
      });
      setSuccess(`Booking request sent to ${selected.name}!`);
      setSelected(null);
      setBookDate("");
      fetchBookings();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchGuides(); }, [destination]);
  useEffect(() => { if (activeTab === "bookings") fetchBookings(); }, [activeTab]);

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.headerSub}>VERIFIED FEMALE GUIDES</p>
          <h1 style={S.headerTitle}>Find Your Guide</h1>
          <div style={S.divider} />
          <p style={S.headerDesc}>
            Connect with verified local female guides for a safe and enriching travel experience.
          </p>
        </div>

        {/* Success */}
        {success && <div style={S.successBar}>{success}</div>}

        {/* Tabs */}
        <div style={S.tabs}>
          {[
            { key: "browse",   label: "Browse Guides" },
            { key: "bookings", label: "My Bookings" },
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

        {/* ── BROWSE ── */}
        {activeTab === "browse" && (
          <div>
            {/* Destination Filter */}
            <div style={S.filters}>
              {DESTINATIONS.map(d => (
                <button
                  key={d}
                  style={{ ...S.filterBtn, ...(destination === d ? S.filterActive : {}) }}
                  onClick={() => setDest(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            {loading ? <p style={S.loading}>Loading...</p> : (
              <div style={S.grid}>
                {guides.map(guide => (
                  <div key={guide._id} style={S.card}>

                    {/* Top */}
                    <div style={S.cardTop}>
                      <img
                        src={guide.image}
                        alt={guide.name}
                        style={S.avatar}
                        onError={(e) => { e.target.src = "https://randomuser.me/api/portraits/women/10.jpg"; }}
                      />
                      {guide.verified && <span style={S.verifiedBadge}>Verified</span>}
                    </div>

                    {/* Info */}
                    <div style={S.cardBody}>
                      <h3 style={S.guideName}>{guide.name}</h3>
                      <p style={S.guideLocation}>{guide.destination}</p>
                      <p style={S.guideBio}>{guide.bio}</p>

                      <div style={S.guideMeta}>
                        <div style={S.metaItem}>
                          <p style={S.metaLabel}>LANGUAGE</p>
                          <p style={S.metaValue}>{guide.language}</p>
                        </div>
                        <div style={S.metaItem}>
                          <p style={S.metaLabel}>RATING</p>
                          <p style={S.metaValue}>{"★".repeat(Math.round(guide.rating))} {guide.rating}</p>
                        </div>
                        <div style={S.metaItem}>
                          <p style={S.metaLabel}>PRICE / DAY</p>
                          <p style={S.metaValue}>৳ {guide.pricePerDay?.toLocaleString()}</p>
                        </div>
                        <div style={S.metaItem}>
                          <p style={S.metaLabel}>CONTACT</p>
                          <p style={S.metaValue}>{guide.contact}</p>
                        </div>
                      </div>

                      <button style={S.bookBtn} onClick={() => setSelected(guide)}>
                        Book This Guide
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY BOOKINGS ── */}
        {activeTab === "bookings" && (
          <div style={S.bookingsList}>
            <p style={S.sectionSub}>Your guide booking requests</p>
            {bookings.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.empty}>No bookings yet.</p>
                <button style={S.bookBtn} onClick={() => setActiveTab("browse")}>
                  Browse Guides
                </button>
              </div>
            ) : (
              bookings.map(b => (
                <div key={b._id} style={S.bookingCard}>
                  <img
                    src={b.guideId?.image}
                    alt={b.guideId?.name}
                    style={S.bookingAvatar}
                    onError={(e) => { e.target.src = "https://randomuser.me/api/portraits/women/10.jpg"; }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={S.bookingName}>{b.guideId?.name}</h4>
                    <p style={S.bookingInfo}>{b.guideId?.destination}</p>
                    <p style={S.bookingInfo}>
                      Booking Date: {new Date(b.bookingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{
                    ...S.statusBadge,
                    background: b.paymentStatus === "paid" ? "#d1fae5" : "#fef3c7",
                    color: b.paymentStatus === "paid" ? "#065f46" : "#92400e",
                  }}>
                    {b.paymentStatus}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── BOOKING MODAL ── */}
      {selected && (
        <div style={S.modalOverlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>

            <div style={S.modalHeader}>
              <div>
                <p style={S.modalSub}>BOOKING REQUEST</p>
                <h2 style={S.modalTitle}>{selected.name}</h2>
              </div>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={S.modalDivider} />

            <div style={S.modalInfo}>
              <img src={selected.image} alt={selected.name} style={S.modalAvatar}
                onError={(e) => { e.target.src = "https://randomuser.me/api/portraits/women/10.jpg"; }}
              />
              <div>
                <p style={S.modalDetail}>{selected.destination}</p>
                <p style={S.modalDetail}>{selected.language}</p>
                <p style={S.modalPrice}>৳ {selected.pricePerDay?.toLocaleString()} / day</p>
              </div>
            </div>

            <div style={S.modalDivider} />

            <div style={S.inputGroup}>
              <label style={S.label}>SELECT BOOKING DATE</label>
              <input
                style={S.input}
                type="date"
                value={bookingDate}
                onChange={e => setBookDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div style={S.modalSummary}>
              <p style={S.summaryLabel}>GUIDE</p>
              <p style={S.summaryValue}>{selected.name}</p>
              <p style={S.summaryLabel}>DESTINATION</p>
              <p style={S.summaryValue}>{selected.destination}</p>
              <p style={S.summaryLabel}>RATE</p>
              <p style={S.summaryValue}>৳ {selected.pricePerDay?.toLocaleString()} per day</p>
            </div>

            <button style={S.confirmBtn} onClick={handleBook}>
              Confirm Booking Request
            </button>

            <p style={S.modalNote}>
              The guide will contact you on {selected.contact} to confirm the booking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  wrapper:      { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:           { position: "fixed", inset: 0, backgroundImage: "url('https://plus.unsplash.com/premium_photo-1716866638194-947ba7b24ef8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(0.80px)", transform: "scale(1.05)", zIndex: -2 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(255,245,250,0.82)", zIndex: -1 },
  page:         { maxWidth: 1100, margin: "auto", padding: "40px 24px" },

  header:       { textAlign: "center", marginBottom: 36 },
  headerSub:    { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:  { fontSize: 34, fontWeight: 400, color: "#4a2060", margin: "0 0 14px", letterSpacing: 1 },
  divider:      { width: 50, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  headerDesc:   { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 0.5 },

  successBar:   { background: "#d1fae5", color: "#065f46", padding: "12px 20px", borderRadius: 10, textAlign: "center", marginBottom: 20, fontFamily: "sans-serif", fontSize: 14 },

  tabs:         { display: "flex", gap: 0, justifyContent: "center", marginBottom: 32, border: "1px solid #e2c4e2", borderRadius: 30, overflow: "hidden", maxWidth: 320, margin: "0 auto 32px" },
  tab:          { flex: 1, padding: "11px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1 },
  tabActive:    { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff" },

  filters:      { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32 },
  filterBtn:    { padding: "7px 16px", borderRadius: 20, border: "1px solid #d4a8d4", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", background: "rgba(255,255,255,0.8)", color: "#7c3aed", letterSpacing: 0.5 },
  filterActive: { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "1px solid transparent" },

  loading:      { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 2 },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 24 },

  card:         { background: "rgba(255,255,255,0.92)", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(157,107,157,0.12)", backdropFilter: "blur(10px)" },
  cardTop:      { position: "relative", height: 120, background: "linear-gradient(135deg,#f3e8ff,#fce7f3)", display: "flex", alignItems: "center", justifyContent: "center" },
  avatar:       { width: 80, height: 80, borderRadius: "50%", border: "3px solid #fff", objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  verifiedBadge:{ position: "absolute", top: 12, right: 12, background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: "sans-serif", letterSpacing: 1 },

  cardBody:     { padding: "20px" },
  guideName:    { fontSize: 18, fontWeight: 400, color: "#3b0764", margin: "0 0 4px", letterSpacing: 0.5 },
  guideLocation:{ fontSize: 11, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 10 },
  guideBio:     { fontSize: 13, color: "#6b5b7b", lineHeight: 1.6, marginBottom: 16, fontFamily: "sans-serif" },

  guideMeta:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  metaItem:     { background: "#faf5ff", borderRadius: 8, padding: "8px 10px" },
  metaLabel:    { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 3px" },
  metaValue:    { fontSize: 12, color: "#3b0764", fontFamily: "sans-serif", margin: 0 },

  bookBtn:      { width: "100%", padding: "11px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },

  bookingsList: { maxWidth: 700, margin: "0 auto" },
  sectionSub:   { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", marginBottom: 24, letterSpacing: 1 },
  emptyBox:     { textAlign: "center", padding: 48 },
  empty:        { color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 16 },

  bookingCard:  { display: "flex", gap: 16, alignItems: "center", padding: 20, background: "rgba(255,255,255,0.92)", borderRadius: 14, marginBottom: 12, boxShadow: "0 2px 12px rgba(157,107,157,0.1)" },
  bookingAvatar:{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #e9d5ff" },
  bookingName:  { fontSize: 16, fontWeight: 400, color: "#3b0764", margin: "0 0 4px" },
  bookingInfo:  { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", margin: "2px 0" },
  statusBadge:  { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(40,0,60,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 },
  modal:        { background: "#fff", padding: "36px", borderRadius: 20, maxWidth: 480, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,0.3)" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalSub:     { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  modalTitle:   { fontSize: 24, fontWeight: 400, color: "#3b0764", margin: 0 },
  closeBtn:     { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9d6b9d" },
  modalDivider: { height: 1, background: "#f3e8ff", margin: "16px 0" },

  modalInfo:    { display: "flex", gap: 16, alignItems: "center", marginBottom: 8 },
  modalAvatar:  { width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #e9d5ff" },
  modalDetail:  { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", margin: "2px 0" },
  modalPrice:   { fontSize: 16, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600, margin: "4px 0" },

  inputGroup:   { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  label:        { fontSize: 10, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif" },
  input:        { padding: "11px 14px", border: "1px solid #e2c4e2", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "sans-serif" },

  modalSummary: { background: "#faf5ff", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" },
  summaryLabel: { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: 0 },
  summaryValue: { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", margin: "0 0 8px" },

  confirmBtn:   { width: "100%", padding: 14, background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, marginBottom: 14 },
  modalNote:    { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", textAlign: "center", lineHeight: 1.6 },
};