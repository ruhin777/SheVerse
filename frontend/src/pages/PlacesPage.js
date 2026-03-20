import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/places";
const CATEGORIES = ["All", "park", "museum", "beach", "hill", "historical", "other"];

export default function PlacesPage() {
  const [places, setPlaces] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(null);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category !== "All") params.category = category;
      const { data } = await axios.get(`${API}/all`, { params });
      setPlaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = async (id) => {
    const { data } = await axios.get(`${API}/${id}/recommendations`);
    setPanel(data);
  };

  useEffect(() => { fetchPlaces(); }, [category]);

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.headerSub}>DISCOVER BANGLADESH</p>
          <h1 style={S.headerTitle}>Explore Places</h1>
          <div style={S.divider} />
        </div>

        {/* Search */}
        <div style={S.searchRow}>
          <input
            style={S.input}
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPlaces()}
          />
          <button style={S.searchBtn} onClick={fetchPlaces}>Search</button>
        </div>

        {/* Filters */}
        <div style={S.filters}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              style={{ ...S.filterBtn, ...(category === c ? S.activeFilter : {}) }}
              onClick={() => setCategory(c)}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#9d6b9d", letterSpacing: 2 }}>Loading...</p>
        ) : (
          <div style={S.grid}>
            {places.map((p) => (
              <div
                key={p._id}
                style={S.card}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 24px 48px rgba(157,107,157,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                }}
              >
                {/* Image */}
                <div style={S.imageBox}>
                  {p.image
                    ? <img src={p.image} alt={p.name} style={S.image} />
                    : <div style={S.imagePlaceholder}>{p.name[0]}</div>
                  }
                  <span style={S.categoryTag}>{p.category}</span>
                </div>

                {/* Body */}
                <div style={S.cardBody}>
                  <h3 style={S.cardTitle}>{p.name}</h3>
                  <p style={S.cardCity}>{p.city}</p>
                  <p style={S.cardDesc}>{p.description?.slice(0, 75)}...</p>
                  <div style={S.cardFooter}>
                    <span style={S.rating}>{"★".repeat(Math.round(p.rating))} {p.rating}</span>
                    <button style={S.exploreBtn} onClick={() => openPanel(p._id)}>
                      Explore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel */}
      {panel && (
        <div style={S.modalOverlay} onClick={() => setPanel(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>

            <div style={S.modalHeader}>
              <div>
                <p style={S.modalSub}>{panel.place.category?.toUpperCase()}</p>
                <h2 style={S.modalTitle}>{panel.place.name}</h2>
              </div>
              <button style={S.closeBtn} onClick={() => setPanel(null)}>✕</button>
            </div>

            <div style={S.modalDivider} />
            <p style={S.modalDesc}>{panel.place.description}</p>

            {/* Similar Places */}
            <h4 style={S.sectionLabel}>Similar Destinations</h4>
            <div style={S.tagRow}>
              {panel.similarPlaces.map(p => (
                <span key={p._id} style={S.placeTag}>{p.name}</span>
              ))}
            </div>

            {/* Restaurants */}
            <h4 style={S.sectionLabel}>Nearby Dining</h4>
            <div style={S.restaurantList}>
              {panel.nearbyRestaurants.map(r => (
                <div key={r._id} style={S.restaurantItem}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{r.name}</strong>
                    <p style={{ fontSize: 12, color: "#9d6b9d", margin: "2px 0" }}>{r.cuisine} · {r.priceRange}</p>
                  </div>
                  <span style={S.ratingSmall}>★ {r.rating}</span>
                </div>
              ))}
            </div>

            <button style={S.modalCloseBtn} onClick={() => setPanel(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  wrapper:    { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:         { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/998903/pexels-photo-998903.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(0.5px)", transform: "scale(1.1)", zIndex: -2 },
  overlay:    { position: "fixed", inset: 0, background: "rgba(255,245,250,0.75)", zIndex: -1 },
  page:       { maxWidth: 1100, margin: "auto", padding: "40px 24px" },

  header:     { textAlign: "center", marginBottom: 40 },
  headerSub:  { fontSize: 11, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:{ fontSize: 36, fontWeight: 400, color: "#4a2060", margin: "0 0 16px", letterSpacing: 1 },
  divider:    { width: 60, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto" },

  searchRow:  { display: "flex", gap: 10, justifyContent: "center", marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" },
  input:      { flex: 1, padding: "12px 18px", borderRadius: 30, border: "1px solid #e2c4e2", outline: "none", fontSize: 14, fontFamily: "sans-serif", background: "rgba(255,255,255,0.9)" },
  searchBtn:  { padding: "12px 24px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 30, cursor: "pointer", fontSize: 14, fontFamily: "sans-serif", fontWeight: 600 },

  filters:    { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 36 },
  filterBtn:  { padding: "7px 18px", borderRadius: 20, border: "1px solid #d4a8d4", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", background: "rgba(255,255,255,0.8)", color: "#7c3aed", letterSpacing: 1 },
  activeFilter:{ background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "1px solid transparent" },

  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 24 },

  card:       { borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(0.80px)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transition: "all 0.3s ease" },
  imageBox:   { position: "relative", height: 180, overflow: "hidden" },
  image:      { width: "100%", height: "100%", objectFit: "cover" },
  imagePlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#e9d5ff,#fce7f3)", fontSize: 48, color: "#9d4edd", fontFamily: "Georgia, serif" },
  categoryTag:{ position: "absolute", top: 12, right: 12, background: "rgba(157,78,221,0.85)", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, letterSpacing: 2, fontFamily: "sans-serif" },

  cardBody:   { padding: "18px 20px" },
  cardTitle:  { fontSize: 18, fontWeight: 600, color: "#3b0764", margin: "0 0 4px", letterSpacing: 0.5 },
  cardCity:   { fontSize: 12, color: "#9d6b9d", letterSpacing: 1, marginBottom: 8, fontFamily: "sans-serif" },
  cardDesc:   { fontSize: 13, color: "#6b5b7b", lineHeight: 1.6, marginBottom: 14, fontFamily: "sans-serif" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  rating:     { color: "#c084c4", fontSize: 13, fontFamily: "sans-serif" },
  exploreBtn: { padding: "8px 20px", background: "transparent", border: "1px solid #9d4edd", color: "#9d4edd", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1, transition: "all 0.2s" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(40,0,60,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 },
  modal:      { background: "#fff", padding: "36px", borderRadius: 20, maxWidth: 580, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,0.3)" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalSub:   { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  modalTitle: { fontSize: 26, fontWeight: 400, color: "#3b0764", margin: 0, letterSpacing: 0.5 },
  closeBtn:   { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9d6b9d" },
  modalDivider:{ height: 1, background: "#f3e8ff", margin: "16px 0" },
  modalDesc:  { fontSize: 14, color: "#6b5b7b", lineHeight: 1.8, marginBottom: 24, fontFamily: "sans-serif" },
  sectionLabel:{ fontSize: 11, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 12, marginTop: 20 },
  tagRow:     { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  placeTag:   { padding: "6px 14px", border: "1px solid #e9d5ff", borderRadius: 20, fontSize: 13, color: "#7c3aed", fontFamily: "sans-serif" },
  restaurantList: { display: "flex", flexDirection: "column", gap: 10 },
  restaurantItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#faf5ff", borderRadius: 10 },
  ratingSmall:{ color: "#c084c4", fontSize: 13, fontFamily: "sans-serif" },
  modalCloseBtn: { marginTop: 28, width: "100%", padding: "12px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: "sans-serif", letterSpacing: 1 },
};