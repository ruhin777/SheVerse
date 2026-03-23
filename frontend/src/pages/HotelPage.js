import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/hotels";
const LOCATIONS = ["All", "Cox's Bazar", "Sajek Valley", "Bandarban", "Sundarbans", "Dhaka", "Rangamati", "Sylhet"];

export default function HotelPage() {
  const [hotels, setHotels]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [location, setLocation]     = useState("All");
  const [selected, setSelected]     = useState(null);
  const [checkIn, setCheckIn]       = useState("");
  const [checkOut, setCheckOut]     = useState("");
  const [bookings, setBookings]     = useState([]);
  const [activeTab, setActiveTab]   = useState("browse");
  const [success, setSuccess]       = useState("");
  const [summary, setSummary]       = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = {};
      if (location !== "All") params.location = location;
      const { data } = await axios.get(`${API}/all`, { params });
      setHotels(data);
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

  const calcNights = () => {
    if (!checkIn || !checkOut) return 0;
    return Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  };

  const handleBook = async () => {
    if (!checkIn || !checkOut) { alert("Please select check-in and check-out dates!"); return; }
    if (calcNights() <= 0) { alert("Check-out must be after check-in!"); return; }
    try {
      const { data } = await axios.post(`${API}/book`, {
        userId: user._id,
        hotelId: selected._id,
        checkIn,
        checkOut,
      });
      setSummary(data);
      setSelected(null);
      setCheckIn("");
      setCheckOut("");
      setSuccess(`Booking confirmed at ${data.hotel.name}!`);
      fetchBookings();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed!");
    }
  };

  useEffect(() => { fetchHotels(); }, [location]);
  useEffect(() => { if (activeTab === "bookings") fetchBookings(); }, [activeTab]);

  const nights = calcNights();
  const totalPrice = selected ? nights * selected.pricePerNight : 0;

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.headerSub}>VERIFIED SAFE ACCOMMODATIONS</p>
          <h1 style={S.headerTitle}>Hotel Booking</h1>
          <div style={S.divider} />
          <p style={S.headerDesc}>
            All hotels are safety-verified for solo female travelers.
          </p>
        </div>

        {/* Success */}
        {success && <div style={S.successBar}>{success}</div>}

        {/* Tabs */}
        <div style={S.tabs}>
          {[
            { key: "browse",   label: "Browse Hotels" },
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
            {/* Location Filter */}
            <div style={S.filters}>
              {LOCATIONS.map(l => (
                <button
                  key={l}
                  style={{ ...S.filterBtn, ...(location === l ? S.filterActive : {}) }}
                  onClick={() => setLocation(l)}
                >
                  {l}
                </button>
              ))}
            </div>

            {loading ? <p style={S.loading}>Loading...</p> : (
              <div style={S.grid}>
                {hotels.map(hotel => (
                  <div key={hotel._id} style={S.card}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(157,107,157,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(157,107,157,0.1)"; }}
                  >
                    {/* Image */}
                    <div style={S.imageBox}>
                      <img src={hotel.image} alt={hotel.name} style={S.image}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      {hotel.safetyVerified && (
                        <span style={S.verifiedBadge}>Safety Verified</span>
                      )}
                    </div>

                    {/* Body */}
                    <div style={S.cardBody}>
                      <p style={S.hotelLocation}>{hotel.location}</p>
                      <h3 style={S.hotelName}>{hotel.name}</h3>
                      <p style={S.hotelDesc}>{hotel.description?.slice(0, 80)}...</p>

                      {/* Amenities */}
                      <div style={S.amenities}>
                        {hotel.amenities?.slice(0, 3).map(a => (
                          <span key={a} style={S.amenityTag}>{a}</span>
                        ))}
                      </div>

                      <div style={S.cardFooter}>
                        <div>
                          <p style={S.priceLabel}>PER NIGHT</p>
                          <p style={S.price}>৳ {hotel.pricePerNight?.toLocaleString()}</p>
                        </div>
                        <div style={S.ratingBox}>
                          <span style={S.rating}>{"★".repeat(Math.round(hotel.rating))}</span>
                          <span style={S.ratingNum}>{hotel.rating}</span>
                        </div>
                      </div>

                      <button style={S.bookBtn} onClick={() => setSelected(hotel)}>
                        Book Now
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
            <p style={S.sectionSub}>Your hotel reservations</p>
            {bookings.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.empty}>No bookings yet.</p>
                <button style={S.bookBtn} onClick={() => setActiveTab("browse")}>
                  Browse Hotels
                </button>
              </div>
            ) : (
              bookings.map(b => {
                const nights = Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (1000 * 60 * 60 * 24));
                const total  = nights * (b.hotelId?.pricePerNight || 0);
                return (
                  <div key={b._id} style={S.bookingCard}>
                    <img src={b.hotelId?.image} alt={b.hotelId?.name} style={S.bookingImg}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={S.bookingName}>{b.hotelId?.name}</h4>
                      <p style={S.bookingInfo}>{b.hotelId?.location}</p>
                      <p style={S.bookingInfo}>
                        {new Date(b.checkIn).toLocaleDateString()} — {new Date(b.checkOut).toLocaleDateString()} · {nights} nights
                      </p>
                      <p style={S.bookingTotal}>৳ {total?.toLocaleString()}</p>
                    </div>
                    <span style={{
                      ...S.statusBadge,
                      background: b.paymentStatus === "paid" ? "#d1fae5" : "#fef3c7",
                      color: b.paymentStatus === "paid" ? "#065f46" : "#92400e",
                    }}>
                      {b.paymentStatus}
                    </span>
                  </div>
                );
              })
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
                <p style={S.modalSub}>BOOK YOUR STAY</p>
                <h2 style={S.modalTitle}>{selected.name}</h2>
              </div>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={S.modalDivider} />

            {/* Hotel Info */}
            <div style={S.modalHotelInfo}>
              <img src={selected.image} alt={selected.name} style={S.modalImg}
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div>
                <p style={S.modalLocation}>{selected.location}</p>
                <p style={S.modalPrice}>৳ {selected.pricePerNight?.toLocaleString()} / night</p>
                <div style={S.amenities}>
                  {selected.amenities?.map(a => (
                    <span key={a} style={S.amenityTag}>{a}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={S.modalDivider} />

            {/* Date Selection */}
            <div style={S.dateRow}>
              <div style={S.inputGroup}>
                <label style={S.label}>CHECK-IN DATE</label>
                <input
                  style={S.input}
                  type="date"
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div style={S.inputGroup}>
                <label style={S.label}>CHECK-OUT DATE</label>
                <input
                  style={S.input}
                  type="date"
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            {/* Summary */}
            {nights > 0 && (
              <div style={S.summary}>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Nights</span>
                  <span style={S.summaryValue}>{nights}</span>
                </div>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Rate per night</span>
                  <span style={S.summaryValue}>৳ {selected.pricePerNight?.toLocaleString()}</span>
                </div>
                <div style={S.modalDivider} />
                <div style={S.summaryRow}>
                  <span style={{ ...S.summaryLabel, fontWeight: 700, color: "#3b0764" }}>Total</span>
                  <span style={{ ...S.summaryValue, fontWeight: 700, color: "#7c3aed", fontSize: 18 }}>
                    ৳ {totalPrice?.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button style={S.confirmBtn} onClick={handleBook}>
              Confirm Booking
            </button>

            <p style={S.modalNote}>
              Payment will be collected at the hotel. Booking is free to reserve.
            </p>
          </div>
        </div>
      )}

      {/* ── BOOKING SUCCESS SUMMARY ── */}
      {summary && (
        <div style={S.modalOverlay} onClick={() => setSummary(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={S.successIcon}>✓</div>
              <p style={S.modalSub}>BOOKING CONFIRMED</p>
              <h2 style={S.modalTitle}>{summary.hotel?.name}</h2>
              <div style={S.modalDivider} />
              <div style={S.summary}>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Location</span>
                  <span style={S.summaryValue}>{summary.hotel?.location}</span>
                </div>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Check-in</span>
                  <span style={S.summaryValue}>{new Date(summary.booking?.checkIn).toLocaleDateString()}</span>
                </div>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Check-out</span>
                  <span style={S.summaryValue}>{new Date(summary.booking?.checkOut).toLocaleDateString()}</span>
                </div>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Nights</span>
                  <span style={S.summaryValue}>{summary.nights}</span>
                </div>
                <div style={S.modalDivider} />
                <div style={S.summaryRow}>
                  <span style={{ ...S.summaryLabel, fontWeight: 700, color: "#3b0764" }}>Total Amount</span>
                  <span style={{ ...S.summaryValue, fontWeight: 700, color: "#7c3aed", fontSize: 18 }}>
                    ৳ {summary.totalPrice?.toLocaleString()}
                  </span>
                </div>
              </div>
              <p style={S.modalNote}>Your booking has been saved. Check "My Bookings" to view it.</p>
              <button style={S.confirmBtn} onClick={() => { setSummary(null); setActiveTab("bookings"); }}>
                View My Bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  wrapper:      { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:           { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/36386162/pexels-photo-36386162.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(.80px)", transform: "scale(1.05)", zIndex: -2 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(255,245,250,0.82)", zIndex: -1 },
  page:         { maxWidth: 1100, margin: "auto", padding: "40px 24px" },

  header:       { textAlign: "center", marginBottom: 36 },
  headerSub:    { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:  { fontSize: 34, fontWeight: 400, color: "#4a2060", margin: "0 0 14px", letterSpacing: 1 },
  divider:      { width: 50, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  headerDesc:   { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 0.5 },

  successBar:   { background: "#d1fae5", color: "#065f46", padding: "12px 20px", borderRadius: 10, textAlign: "center", marginBottom: 20, fontFamily: "sans-serif", fontSize: 14 },

  tabs:         { display: "flex", justifyContent: "center", marginBottom: 32, border: "1px solid #e2c4e2", borderRadius: 30, overflow: "hidden", maxWidth: 320, margin: "0 auto 32px" },
  tab:          { flex: 1, padding: "11px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1 },
  tabActive:    { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff" },

  filters:      { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32 },
  filterBtn:    { padding: "7px 16px", borderRadius: 20, border: "1px solid #d4a8d4", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", background: "rgba(255,255,255,0.8)", color: "#7c3aed", letterSpacing: 0.5 },
  filterActive: { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "1px solid transparent" },

  loading:      { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 2 },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 24 },

  card:         { background: "rgba(255,255,255,0.92)", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(157,107,157,0.1)", transition: "all 0.3s ease", backdropFilter: "blur(10px)" },
  imageBox:     { position: "relative", height: 200, overflow: "hidden" },
  image:        { width: "100%", height: "100%", objectFit: "cover" },
  verifiedBadge:{ position: "absolute", top: 12, left: 12, background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontFamily: "sans-serif", letterSpacing: 1 },

  cardBody:     { padding: "20px" },
  hotelLocation:{ fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 4px" },
  hotelName:    { fontSize: 18, fontWeight: 400, color: "#3b0764", margin: "0 0 8px", letterSpacing: 0.5 },
  hotelDesc:    { fontSize: 13, color: "#6b5b7b", lineHeight: 1.6, marginBottom: 12, fontFamily: "sans-serif" },

  amenities:    { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  amenityTag:   { padding: "3px 10px", background: "#f3e8ff", borderRadius: 20, fontSize: 11, color: "#7c3aed", fontFamily: "sans-serif" },

  cardFooter:   { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 },
  priceLabel:   { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 2px" },
  price:        { fontSize: 20, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif", margin: 0 },
  ratingBox:    { textAlign: "right" },
  rating:       { color: "#f59e0b", fontSize: 14 },
  ratingNum:    { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", marginLeft: 4 },

  bookBtn:      { width: "100%", padding: "11px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },

  bookingsList: { maxWidth: 700, margin: "0 auto" },
  sectionSub:   { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", marginBottom: 24, letterSpacing: 1 },
  emptyBox:     { textAlign: "center", padding: 48 },
  empty:        { color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 16 },

  bookingCard:  { display: "flex", gap: 16, alignItems: "center", padding: 20, background: "rgba(255,255,255,0.92)", borderRadius: 14, marginBottom: 12, boxShadow: "0 2px 12px rgba(157,107,157,0.1)" },
  bookingImg:   { width: 80, height: 64, borderRadius: 10, objectFit: "cover" },
  bookingName:  { fontSize: 16, fontWeight: 400, color: "#3b0764", margin: "0 0 4px" },
  bookingInfo:  { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", margin: "2px 0" },
  bookingTotal: { fontSize: 14, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600, margin: "4px 0 0" },
  statusBadge:  { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1, whiteSpace: "nowrap" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(40,0,60,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 },
  modal:        { background: "#fff", padding: "36px", borderRadius: 20, maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,0.3)" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalSub:     { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  modalTitle:   { fontSize: 22, fontWeight: 400, color: "#3b0764", margin: 0 },
  closeBtn:     { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9d6b9d" },
  modalDivider: { height: 1, background: "#f3e8ff", margin: "16px 0" },

  modalHotelInfo:{ display: "flex", gap: 16, alignItems: "flex-start" },
  modalImg:     { width: 100, height: 72, borderRadius: 10, objectFit: "cover" },
  modalLocation:{ fontSize: 11, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 4px" },
  modalPrice:   { fontSize: 16, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600, margin: "0 0 8px" },

  dateRow:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  inputGroup:   { display: "flex", flexDirection: "column", gap: 6 },
  label:        { fontSize: 10, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif" },
  input:        { padding: "11px 14px", border: "1px solid #e2c4e2", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "sans-serif" },

  summary:      { background: "#faf5ff", borderRadius: 12, padding: "16px 20px", marginBottom: 20 },
  summaryRow:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" },
  summaryValue: { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif" },

  confirmBtn:   { width: "100%", padding: 14, background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, marginBottom: 12 },
  modalNote:    { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", textAlign: "center", lineHeight: 1.6, margin: "0 0 16px" },
  successIcon:  { width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
};