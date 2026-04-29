import { useState, useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  useMap, Circle, CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import API from "../services/api";

// ── Fix Leaflet icons ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Service type config ──
const SERVICE_TYPES = [
  { key: "hospital",     label: "Hospitals",       emoji: "🏥", color: "#dc2626" },
  { key: "police",       label: "Police Stations", emoji: "👮", color: "#1d4ed8" },
  { key: "fire_station", label: "Fire Services",   emoji: "🚒", color: "#ea580c" },
];

const UNSAFE_THRESHOLD = 3;    // incidents needed to mark unsafe
const CLUSTER_RADIUS_M = 500;  // meters to cluster incidents together

// ── Icon factories ──
function makeServiceIcon(color, emoji) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};border:3px solid #fff;border-radius:50%;
      width:36px;height:36px;display:flex;align-items:center;
      justify-content:center;font-size:16px;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);">${emoji}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  });
}

const myIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;
    background:#7c3aed;border:3px solid #fff;
    box-shadow:0 0 0 6px rgba(124,58,237,0.2);"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12],
});

// ── Map helpers ──
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 14, { animate: true, duration: 1.2 });
  }, [center, map]);
  return null;
}

// ── Haversine distance in km ──
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Geocode a location string via Nominatim (free, no key) ──
async function geocode(locationStr) {
  try {
    const q = encodeURIComponent(locationStr);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "SheVerse-App" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (_) {}
  return null;
}

// ── Cluster incidents by proximity ──
function clusterIncidents(incidents) {
  const clusters = [];
  const used = new Set();

  incidents.forEach((inc, i) => {
    if (used.has(i)) return;
    const group = [inc];
    used.add(i);

    incidents.forEach((other, j) => {
      if (used.has(j)) return;
      const d = distKm(inc.lat, inc.lng, other.lat, other.lng);
      if (d * 1000 <= CLUSTER_RADIUS_M) {
        group.push(other);
        used.add(j);
      }
    });

    // Centroid of cluster
    const lat = group.reduce((s, g) => s + g.lat, 0) / group.length;
    const lng = group.reduce((s, g) => s + g.lng, 0) / group.length;
    clusters.push({ lat, lng, count: group.length, incidents: group });
  });

  return clusters;
}

// ── Main Component ──
export default function EmergencyServicesPage() {
  const [userCoords, setUserCoords]       = useState(null);
  const [services, setServices]           = useState([]);
  const [filter, setFilter]               = useState("all");
  const [loading, setLoading]             = useState(false);
  const [locError, setLocError]           = useState("");
  const [mapCenter, setMapCenter]         = useState([23.8103, 90.4125]);
  const [selected, setSelected]           = useState(null);
  const [radius, setRadius]               = useState(3000);

  // Incident layer state
  const [incidents, setIncidents]         = useState([]); // geocoded incidents
  const [incidentClusters, setIncidentClusters] = useState([]);
  const [showIncidents, setShowIncidents] = useState(true);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const geocacheRef = useRef({});  // cache geocoded results
  const fetchTimeoutRef = useRef(null); // debounce Overpass calls

  useEffect(() => {
    detectLocation();
    loadIncidents();
  }, []);

  // ── Detect user GPS ──
const detectLocation = (currentRadius = radius) => {
  setLocError("");
  setLoading(true);
  setServices([]);

  if (!navigator.geolocation) {
    setLocError("Geolocation is not supported by your browser.");
    setLoading(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);
      setMapCenter([coords.lat, coords.lng]);
      // Save last known position so reload can reuse it
      sessionStorage.setItem("sv_coords", JSON.stringify(coords));
      fetchNearbyServices(coords.lat, coords.lng, currentRadius);
    },
    () => {
      // Geolocation failed — try last saved position from sessionStorage
      const saved = sessionStorage.getItem("sv_coords");
      if (saved) {
        try {
          const coords = JSON.parse(saved);
          setUserCoords(coords);
          setMapCenter([coords.lat, coords.lng]);
          fetchNearbyServices(coords.lat, coords.lng, currentRadius);
          setLocError("Using last known location. Click 'Detect My Location' to refresh.");
        } catch {
          setLocError("Could not detect your location. Please allow location access and try again.");
          setLoading(false);
        }
      } else {
        setLocError("Could not detect your location. Please allow location access and try again.");
        setLoading(false);
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

  // ── Load & geocode incidents ──
  const loadIncidents = async () => {
    setIncidentLoading(true);
    try {
      const res = await API.get("/api/incidents/map");
      const raw = res.data;

      // Geocode each unique location string (with caching)
      const geocoded = [];
      for (const inc of raw) {
        if (!inc.location) continue;
        let coords = geocacheRef.current[inc.location];
        if (!coords) {
          coords = await geocode(inc.location);
          if (coords) geocacheRef.current[inc.location] = coords;
          // Small delay to respect Nominatim rate limits
          await new Promise(r => setTimeout(r, 200));
        }
        if (coords) {
          geocoded.push({ ...inc, lat: coords.lat, lng: coords.lng });
        }
      }

      setIncidents(geocoded);
      setIncidentClusters(clusterIncidents(geocoded));
    } catch (_) {}
    setIncidentLoading(false);
  };

  // ── Fetch nearby emergency services via Overpass API ──
const fetchNearbyServices = (lat, lng, rad) => {
  // Debounce: cancel any pending fetch before starting a new one
  if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

  fetchTimeoutRef.current = setTimeout(async () => {
    setLoading(true);
    setServices([]);
    setLocError("");

    const attemptFetch = async (attempt) => {
      try {
        const query = `
          [out:json][timeout:25];
          (
            node[amenity~"hospital|clinic"](around:${rad},${lat},${lng});
            way[amenity~"hospital|clinic"](around:${rad},${lat},${lng});
            node[amenity="police"](around:${rad},${lat},${lng});
            way[amenity="police"](around:${rad},${lat},${lng});
            node[amenity="fire_station"](around:${rad},${lat},${lng});
            way[amenity="fire_station"](around:${rad},${lat},${lng});
          );
          out center;
        `;

        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: query,
        });

        // Overpass returns 429 (rate limit) or 504 (gateway timeout) under load
        if (!res.ok) {
          if ((res.status === 429 || res.status === 504) && attempt < 3) {
            // Wait 2s then retry
            await new Promise(r => setTimeout(r, 2000));
            return attemptFetch(attempt + 1);
          }
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();

        const parsed = data.elements
          .map((el) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            if (!elLat || !elLng) return null;
            const amenity = el.tags?.amenity || "";
            let type = "hospital";
            if (amenity === "police") type = "police";
            if (amenity === "fire_station") type = "fire_station";
            return {
              id: el.id,
              type,
              name: el.tags?.name || el.tags?.["name:en"] || capitalize(amenity.replace("_", " ")),
              address: buildAddress(el.tags),
              phone: el.tags?.phone || el.tags?.["contact:phone"] || el.tags?.["contact:mobile"] || null,
              lat: elLat,
              lng: elLng,
              distKm: distKm(lat, lng, elLat, elLng),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.distKm - b.distKm);

        setServices(parsed);
      } catch (err) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000));
          return attemptFetch(attempt + 1);
        }
        setLocError("Failed to fetch nearby services. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    await attemptFetch(1);
  }, 500); // 500ms debounce prevents hammering Overpass on fast dropdown changes
};

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const buildAddress = (tags) => {
    if (!tags) return null;
    const parts = [
      tags["addr:housenumber"], tags["addr:street"],
      tags["addr:suburb"] || tags["addr:quarter"], tags["addr:city"],
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const getConfig = (type) => SERVICE_TYPES.find(t => t.key === type) || SERVICE_TYPES[0];
  const filtered = filter === "all" ? services : services.filter(s => s.type === filter);

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // ── Unsafe zone color by incident count ──
  const unsafeColor = (count) => {
    if (count >= 8) return { fill: "#7f1d1d", stroke: "#991b1b" }; // deep red
    if (count >= 5) return { fill: "#dc2626", stroke: "#b91c1c" }; // red
    return { fill: "#f97316", stroke: "#ea580c" };                 // orange (3-4)
  };

  const unsafeLabel = (count) => {
    if (count >= 8) return "🔴 High Risk Zone";
    if (count >= 5) return "🔴 Unsafe Area";
    return "🟠 Caution Area";
  };

  return (
    <div style={S.wrapper}>
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.sub}>SAFETY — EMERGENCY SERVICES</p>
          <h1 style={S.title}>Nearby Emergency Services</h1>
          <div style={S.divider} />
          <p style={S.desc}>
            Find hospitals, police stations, and fire services near you.
            Community-reported incidents are shown to help you avoid unsafe areas.
          </p>
        </div>

        {/* Controls row */}
        <div style={S.controlsRow}>
          <button style={S.detectBtn} onClick={detectLocation} disabled={loading}>
            {loading ? "🔄 Loading…" : "📍 Detect My Location"}
          </button>
          <select
            style={S.select}
            value={radius}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRadius(r); 
              if (userCoords) {
                fetchNearbyServices(userCoords.lat, userCoords.lng, r);
              } else {
                const saved = sessionStorage.getItem("sv_coords");
                if (saved) {
                  try {
                    const coords = JSON.parse(saved);
                    setUserCoords(coords);
                    setMapCenter([coords.lat, coords.lng]);
                    fetchNearbyServices(coords.lat, coords.lng, r);
                  } catch {}
                }
              }
            }}
          >
            <option value={1000}>Within 1 km</option>
            <option value={3000}>Within 3 km</option>
            <option value={5000}>Within 5 km</option>
            <option value={10000}>Within 10 km</option>
          </select>

          {/* Incident layer toggle */}
          <button
            style={{
              ...S.toggleLayerBtn,
              background: showIncidents
                ? "linear-gradient(135deg,#dc2626,#f97316)"
                : "transparent",
              color: showIncidents ? "#fff" : "#9d6b9d",
              border: showIncidents ? "none" : "1.5px solid #e9d5ff",
            }}
            onClick={() => setShowIncidents(v => !v)}
          >
            {showIncidents ? "🔴 Hide Incidents" : "🔴 Show Incidents"}
            {incidentLoading && " …"}
          </button>
        </div>

        {locError && <div style={S.errorBox}>⚠️ {locError}</div>}

        {/* Incident summary banner */}
        {showIncidents && incidents.length > 0 && (
          <div style={S.incidentBanner}>
            <span style={S.bannerIcon}>⚠️</span>
            <div>
              <strong style={S.bannerTitle}>
                {incidents.length} community incident{incidents.length !== 1 ? "s" : ""} reported on this map
              </strong>
              <p style={S.bannerSub}>
                {incidentClusters.filter(c => c.count >= UNSAFE_THRESHOLD).length} unsafe zone{incidentClusters.filter(c => c.count >= UNSAFE_THRESHOLD).length !== 1 ? "s" : ""} detected.
                Red/orange areas should be avoided when possible.
              </p>
            </div>
          </div>
        )}

        {/* Service filter chips */}
        <div style={S.filterRow}>
          {["all", ...SERVICE_TYPES.map(t => t.key)].map((key) => {
            const cfg = SERVICE_TYPES.find(t => t.key === key);
            const label = key === "all" ? "🗺️ All" : `${cfg.emoji} ${cfg.label}`;
            const count = key === "all" ? services.length : services.filter(s => s.type === key).length;
            return (
              <button
                key={key}
                style={{
                  ...S.filterChip,
                  background: filter === key ? "linear-gradient(135deg,#7c3aed,#c084c4)" : "#fdf4ff",
                  color: filter === key ? "#fff" : "#7c3aed",
                  border: filter === key ? "none" : "1.5px solid #e9d5ff",
                }}
                onClick={() => setFilter(key)}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* ── MAP ── */}
        <div style={S.mapWrap}>
          <MapContainer
            center={mapCenter}
            zoom={14}
            style={{ width: "100%", height: "100%", borderRadius: 16 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecenter center={mapCenter} />

            {/* User position */}
            {userCoords && (
              <Marker position={[userCoords.lat, userCoords.lng]} icon={myIcon}>
                <Popup><strong>📍 You are here</strong></Popup>
              </Marker>
            )}

            {/* Emergency service markers */}
            {filtered.map((svc) => {
              const cfg = getConfig(svc.type);
              return (
                <Marker
                  key={svc.id}
                  position={[svc.lat, svc.lng]}
                  icon={makeServiceIcon(cfg.color, cfg.emoji)}
                  eventHandlers={{ click: () => setSelected(svc) }}
                >
                  <Popup>
                    <div style={{ fontFamily: "sans-serif", minWidth: 190 }}>
                      <strong style={{ fontSize: 14, color: "#3b0764" }}>
                        {cfg.emoji} {svc.name}
                      </strong><br />
                      {svc.address && (
                        <span style={{ fontSize: 12, color: "#9d6b9d" }}>📍 {svc.address}<br /></span>
                      )}
                      {svc.phone && (
                        <span style={{ fontSize: 12, color: "#9d6b9d" }}>📞 {svc.phone}<br /></span>
                      )}
                      <span style={{ fontSize: 11, color: "#c084c4" }}>
                        🛣️ {svc.distKm.toFixed(2)} km away
                      </span><br />
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block", marginTop: 8,
                          padding: "6px 14px", background: "#7c3aed",
                          color: "#fff", borderRadius: 12,
                          fontSize: 12, textDecoration: "none",
                        }}
                      >
                        Navigate →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* ── INCIDENT LAYER ── */}
            {showIncidents && incidentClusters.map((cluster, idx) => {
              const isUnsafe = cluster.count >= UNSAFE_THRESHOLD;
              const colors = unsafeColor(cluster.count);

              return (
                <div key={idx}>
                  {/* Unsafe zone circle overlay */}
                  {isUnsafe && (
                    <Circle
                      center={[cluster.lat, cluster.lng]}
                      radius={CLUSTER_RADIUS_M * 0.7}
                      pathOptions={{
                        color: colors.stroke,
                        fillColor: colors.fill,
                        fillOpacity: 0.18,
                        weight: 2,
                        dashArray: "6 4",
                      }}
                    />
                  )}

                  {/* Dot for each cluster centroid */}
                  <CircleMarker
                    center={[cluster.lat, cluster.lng]}
                    radius={isUnsafe ? Math.min(6 + cluster.count * 1.5, 16) : 6}
                    pathOptions={{
                      color: isUnsafe ? colors.stroke : "#dc2626",
                      fillColor: isUnsafe ? colors.fill : "#f87171",
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: "sans-serif", minWidth: 200 }}>
                        <strong style={{
                          fontSize: 14,
                          color: isUnsafe ? "#7f1d1d" : "#dc2626",
                        }}>
                          {isUnsafe ? unsafeLabel(cluster.count) : "📍 Reported Incident"}
                        </strong>
                        <br />
                        <span style={{ fontSize: 12, color: "#9d6b9d" }}>
                          {cluster.count} incident{cluster.count !== 1 ? "s" : ""} reported in this area
                        </span>
                        <div style={{ marginTop: 8, borderTop: "1px solid #f3e8ff", paddingTop: 8 }}>
                          {cluster.incidents.slice(0, 3).map((inc, i) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                              <span style={{
                                display: "inline-block", fontSize: 10,
                                background: "#fef2f2", color: "#dc2626",
                                padding: "2px 8px", borderRadius: 10, marginBottom: 2,
                                fontWeight: 600,
                              }}>
                                {inc.incidentType || "Incident"}
                              </span><br />
                              <span style={{ fontSize: 11, color: "#6b7280" }}>
                                📅 {fmtDate(inc.dateTime)}
                              </span>
                            </div>
                          ))}
                          {cluster.incidents.length > 3 && (
                            <span style={{ fontSize: 11, color: "#c084c4" }}>
                              +{cluster.incidents.length - 3} more reports
                            </span>
                          )}
                        </div>
                        {isUnsafe && (
                          <div style={{
                            marginTop: 8, padding: "6px 10px",
                            background: "#fef2f2", borderRadius: 8,
                            fontSize: 11, color: "#7f1d1d", lineHeight: 1.5,
                          }}>
                            ⚠️ This area has been flagged as unsafe based on community reports. Exercise caution.
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                </div>
              );
            })}
          </MapContainer>
        </div>

        {/* Legend */}
        <div style={S.legend}>
          <div style={S.legendItem}>
            <div style={{ ...S.legendDot, background: "#7c3aed" }} />
            <span>You</span>
          </div>
          {SERVICE_TYPES.map(t => (
            <div key={t.key} style={S.legendItem}>
              <div style={{ ...S.legendDot, background: t.color }} />
              <span>{t.label}</span>
            </div>
          ))}
          <div style={S.legendDivider} />
          <div style={S.legendItem}>
            <div style={{ ...S.legendDot, background: "#f87171" }} />
            <span>Reported Incident</span>
          </div>
          <div style={S.legendItem}>
            <div style={{ ...S.legendDot, background: "#f97316", border: "2px dashed #ea580c" }} />
            <span>Caution Area (3-4 reports)</span>
          </div>
          <div style={S.legendItem}>
            <div style={{ ...S.legendDot, background: "#dc2626", border: "2px dashed #b91c1c" }} />
            <span>Unsafe Area (5+ reports)</span>
          </div>
          <div style={S.legendItem}>
            <div style={{ ...S.legendDot, background: "#7f1d1d", border: "2px dashed #991b1b" }} />
            <span>High Risk Zone (8+ reports)</span>
          </div>
        </div>

        {/* Loading states */}
        {loading && (
          <div style={S.loadingBox}>
            <div style={S.spinner} />
            <p style={S.loadingText}>Finding nearby emergency services…</p>
          </div>
        )}
        {incidentLoading && !loading && (
          <div style={S.loadingBox}>
            <div style={S.spinner} />
            <p style={S.loadingText}>Loading community incident reports…</p>
          </div>
        )}

        {/* Service list */}
        {!loading && filtered.length > 0 && (
          <>
            <p style={S.listTitle}>
              {filtered.length} service{filtered.length !== 1 ? "s" : ""} found nearby
            </p>
            <div style={S.list}>
              {filtered.map((svc) => {
                const cfg = getConfig(svc.type);
                return (
                  <div
                    key={svc.id}
                    style={{
                      ...S.card,
                      border: selected?.id === svc.id
                        ? `2px solid ${cfg.color}`
                        : "1px solid #f3e8ff",
                    }}
                    onClick={() => {
                      setSelected(svc);
                      setMapCenter([svc.lat, svc.lng]);
                    }}
                  >
                    <div style={S.cardLeft}>
                      <div style={{
                        ...S.serviceIcon,
                        background: cfg.color + "18",
                        border: `1.5px solid ${cfg.color}33`,
                      }}>
                        <span style={{ fontSize: 22 }}>{cfg.emoji}</span>
                      </div>
                      <div>
                        <h3 style={S.cardName}>{svc.name}</h3>
                        {svc.address && <p style={S.cardAddr}>📍 {svc.address}</p>}
                        {svc.phone
                          ? <p style={S.cardPhone}>📞 {svc.phone}</p>
                          : <p style={{ ...S.cardPhone, color: "#d1d5db" }}>📞 No number listed</p>
                        }
                        <p style={S.cardDist}>🛣️ {svc.distKm.toFixed(2)} km away</p>
                      </div>
                    </div>
                    <div style={S.cardActions}>
                      {svc.phone && (
                        <a href={`tel:${svc.phone}`} style={S.callBtn}
                          onClick={e => e.stopPropagation()}>
                          📞 Call
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}`}
                        target="_blank" rel="noreferrer" style={S.navBtn}
                        onClick={e => e.stopPropagation()}
                      >
                        🗺️ Navigate
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!loading && !locError && filtered.length === 0 && userCoords && (
          <div style={S.emptyBox}>
            <p style={S.emptyIcon}>🔍</p>
            <p style={S.emptyText}>No services found. Try increasing the search radius.</p>
          </div>
        )}

      </div>
    </div>
  );
}

const S = {
  wrapper: { minHeight: "100vh", background: "rgba(255,245,250,0.85)", fontFamily: "'Georgia', serif" },
  page: { maxWidth: 860, margin: "0 auto", padding: "40px 24px 60px" },

  header: { textAlign: "center", marginBottom: 32 },
  sub: { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 400, color: "#3b0764", margin: "0 0 14px" },
  divider: { width: 48, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  desc: { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" },

  controlsRow: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  detectBtn: {
    padding: "11px 22px", background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff", border: "none", borderRadius: 20, cursor: "pointer",
    fontSize: 13, fontFamily: "sans-serif",
  },
  select: {
    padding: "11px 16px", border: "1.5px solid #e9d5ff", borderRadius: 20,
    fontSize: 13, fontFamily: "sans-serif", color: "#3b0764",
    background: "#fff", cursor: "pointer", outline: "none",
  },
  toggleLayerBtn: {
    padding: "11px 20px", borderRadius: 20, cursor: "pointer",
    fontSize: 13, fontFamily: "sans-serif", fontWeight: 500, transition: "all 0.25s",
  },

  errorBox: {
    background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12,
    padding: "12px 16px", fontSize: 13, color: "#9f1239",
    fontFamily: "sans-serif", marginBottom: 16,
  },

  incidentBanner: {
    display: "flex", alignItems: "flex-start", gap: 12,
    background: "#fff7ed", border: "1px solid #fed7aa",
    borderRadius: 14, padding: "14px 18px", marginBottom: 16,
  },
  bannerIcon: { fontSize: 22, flexShrink: 0 },
  bannerTitle: { fontSize: 13, color: "#9a3412", fontFamily: "sans-serif", display: "block" },
  bannerSub: { fontSize: 12, color: "#c2410c", fontFamily: "sans-serif", margin: "4px 0 0", lineHeight: 1.5 },

  filterRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  filterChip: {
    padding: "8px 16px", borderRadius: 20, cursor: "pointer",
    fontSize: 12, fontFamily: "sans-serif", fontWeight: 500, transition: "all 0.2s",
  },

  mapWrap: {
    height: 460, borderRadius: 16, overflow: "hidden",
    border: "1px solid #f3e8ff",
    boxShadow: "0 8px 40px rgba(157,107,157,0.13)", marginBottom: 16,
  },

  legend: {
    display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20,
    padding: "12px 16px", background: "rgba(255,255,255,0.9)",
    borderRadius: 12, border: "1px solid #f3e8ff", alignItems: "center",
  },
  legendItem: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 11, color: "#3b0764", fontFamily: "sans-serif",
  },
  legendDot: { width: 13, height: 13, borderRadius: "50%", flexShrink: 0 },
  legendDivider: { width: 1, height: 20, background: "#e9d5ff", margin: "0 4px" },

  loadingBox: { textAlign: "center", padding: "32px 20px" },
  spinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid #f3e8ff", borderTop: "3px solid #7c3aed",
    animation: "spin 1s linear infinite", margin: "0 auto 12px",
  },
  loadingText: { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14 },

  listTitle: { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 12, letterSpacing: 1 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "rgba(255,255,255,0.97)", borderRadius: 16, padding: "16px 20px",
    boxShadow: "0 4px 20px rgba(157,107,157,0.09)", cursor: "pointer",
    transition: "border 0.2s", flexWrap: "wrap", gap: 12,
  },
  cardLeft: { display: "flex", alignItems: "flex-start", gap: 14 },
  serviceIcon: {
    width: 48, height: 48, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardName: { margin: 0, fontSize: 15, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600 },
  cardAddr: { margin: "4px 0 0", fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" },
  cardPhone: { margin: "3px 0 0", fontSize: 12, color: "#7c3aed", fontFamily: "sans-serif" },
  cardDist: { margin: "3px 0 0", fontSize: 11, color: "#c084c4", fontFamily: "sans-serif" },
  cardActions: { display: "flex", gap: 8, flexShrink: 0 },
  callBtn: {
    padding: "8px 16px", background: "#f3e8ff", color: "#7c3aed",
    borderRadius: 20, fontSize: 12, fontFamily: "sans-serif", textDecoration: "none",
  },
  navBtn: {
    padding: "8px 16px", background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff", borderRadius: 20, fontSize: 12,
    fontFamily: "sans-serif", textDecoration: "none",
  },

  emptyBox: { textAlign: "center", padding: "40px 20px" },
  emptyIcon: { fontSize: 40, margin: "0 0 10px" },
  emptyText: { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14 },
};