import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import API from "../services/api";

// Fix Leaflet default marker icons (known React issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored markers
function makeIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid #fff;
      transform:rotate(-45deg);
      box-shadow:0 4px 12px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

const myIcon      = makeIcon("#7c3aed");
const contactIcon = makeIcon("#e879a8");

// Auto-pans map to a new center
function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, map.getZoom(), { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

export default function LiveLocationPage() {
  const [sharing, setSharing]         = useState(false);
  const [myCoords, setMyCoords]       = useState(null);
  const [contactLocs, setContactLocs] = useState([]);
  const [status, setStatus]           = useState("idle"); // idle | starting | active | stopping | error
  const [errorMsg, setErrorMsg]       = useState("");
  const [tab, setTab]                 = useState("my");   // my | contacts
  const [mapCenter, setMapCenter]     = useState([23.8103, 90.4125]); // Dhaka default

  const watchIdRef      = useRef(null);
  const intervalRef     = useRef(null);
  const token           = localStorage.getItem("token");

  // On mount: check if already sharing
  useEffect(() => {
    checkMyStatus();
    return () => stopEverything();
  }, []);

  // Poll contacts every 5 seconds
  useEffect(() => {
    fetchContactLocations();
    const poll = setInterval(fetchContactLocations, 5000);
    return () => clearInterval(poll);
  }, []);

  const checkMyStatus = async () => {
    try {
      const res = await API.get("/api/live-location/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.sharing) {
        setSharing(true);
        setStatus("active");
        setMyCoords({ lat: res.data.latitude, lng: res.data.longitude });
        setMapCenter([res.data.latitude, res.data.longitude]);
        startWatching();
      }
    } catch (_) {}
  };

  const fetchContactLocations = async () => {
    try {
      const res = await API.get("/api/live-location/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContactLocs(res.data);
    } catch (_) {}
  };

  const pushLocation = async (lat, lng) => {
    try {
      await API.post(
        "/api/live-location",
        { latitude: lat, longitude: lng, sharing: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (_) {}
  };

  const startWatching = () => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyCoords({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        pushLocation(latitude, longitude);
      },
      (err) => {
        setErrorMsg("Location access denied. Please allow location permission.");
        setStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const startSharing = async () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setStatus("error");
      return;
    }
    setStatus("starting");
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyCoords({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        await pushLocation(latitude, longitude);
        setSharing(true);
        setStatus("active");
        startWatching();
      },
      () => {
        setErrorMsg("Could not detect your location. Please allow location access.");
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const stopSharing = async () => {
    setStatus("stopping");
    stopEverything();
    try {
      await API.post(
        "/api/live-location",
        { sharing: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (_) {}
    setSharing(false);
    setMyCoords(null);
    setStatus("idle");
  };

  const stopEverything = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const mapsLink = myCoords
    ? `https://www.google.com/maps?q=${myCoords.lat},${myCoords.lng}`
    : null;

  const fmt = (d) => new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div style={S.wrapper}>
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.sub}>SAFETY — REAL-TIME TRACKING</p>
          <h1 style={S.title}>Live Location</h1>
          <div style={S.divider} />
          <p style={S.desc}>
            Share your live location with trusted contacts. They can see you moving in real time on the map.
          </p>
        </div>

        {/* Tabs */}
        <div style={S.tabBar}>
          <button
            style={{ ...S.tabBtn, ...(tab === "my" ? S.tabActive : {}) }}
            onClick={() => setTab("my")}
          >
            📍 My Location
          </button>
          <button
            style={{ ...S.tabBtn, ...(tab === "contacts" ? S.tabActive : {}) }}
            onClick={() => setTab("contacts")}
          >
            👥 Contacts Live ({contactLocs.length})
          </button>
        </div>

        {/* ── MY LOCATION TAB ── */}
        {tab === "my" && (
          <>
            {/* Status Card */}
            <div style={S.statusCard}>
              <div style={S.statusLeft}>
                <div style={{
                  ...S.dot,
                  background: status === "active" ? "#22c55e" : status === "starting" ? "#f59e0b" : "#d1d5db",
                  boxShadow: status === "active" ? "0 0 0 4px rgba(34,197,94,0.2)" : "none",
                }} />
                <div>
                  <p style={S.statusLabel}>
                    {status === "active"   ? "Sharing Live Location"  :
                     status === "starting" ? "Starting…"              :
                     status === "stopping" ? "Stopping…"              :
                     status === "error"    ? "Error"                  :
                                            "Not Sharing"}
                  </p>
                  {status === "active" && myCoords && (
                    <p style={S.statusCoords}>
                      {myCoords.lat.toFixed(5)}, {myCoords.lng.toFixed(5)}
                    </p>
                  )}
                  {status === "error" && (
                    <p style={{ ...S.statusCoords, color: "#dc2626" }}>{errorMsg}</p>
                  )}
                </div>
              </div>

              <div style={S.statusBtns}>
                {!sharing && status !== "starting" && (
                  <button style={S.startBtn} onClick={startSharing}>
                    📍 Start Sharing
                  </button>
                )}
                {sharing && (
                  <button style={S.stopBtn} onClick={stopSharing}>
                    ⏹ Stop Sharing
                  </button>
                )}
                {status === "active" && mapsLink && (
                  <a href={mapsLink} target="_blank" rel="noreferrer" style={S.mapsBtn}>
                    🗺️ Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* Info note */}
            {status === "active" && (
              <div style={S.infoNote}>
                ✅ Your trusted contacts can now see your location updating live on their map.
                Location updates every few seconds.
              </div>
            )}

            {/* Map */}
            <div style={S.mapWrap}>
              <MapContainer
                center={mapCenter}
                zoom={15}
                style={{ width: "100%", height: "100%", borderRadius: 16 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFlyTo center={mapCenter} />
                {myCoords && (
                  <Marker position={[myCoords.lat, myCoords.lng]} icon={myIcon}>
                    <Popup>
                      <strong>📍 You are here</strong><br />
                      {myCoords.lat.toFixed(5)}, {myCoords.lng.toFixed(5)}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {!sharing && status === "idle" && (
              <div style={S.idleNote}>
                Press <strong>Start Sharing</strong> to broadcast your live location to your trusted contacts.
              </div>
            )}
          </>
        )}

        {/* ── CONTACTS LIVE TAB ── */}
        {tab === "contacts" && (
          <>
            <div style={S.mapWrap}>
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ width: "100%", height: "100%", borderRadius: 16 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {contactLocs.map((loc) => (
                  <Marker
                    key={loc._id}
                    position={[loc.latitude, loc.longitude]}
                    icon={contactIcon}
                  >
                    <Popup>
                      <strong>👤 {loc.name}</strong><br />
                      📞 {loc.phone}<br />
                      🕐 Last seen: {fmt(loc.timestamp)}<br />
                      <a
                        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#7c3aed", fontSize: 12 }}  
                      >                
                        Open in Google Maps
                      </a> 
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {contactLocs.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.emptyIcon}>🟢</p>
                <p style={S.emptyText}>None of your trusted contacts are sharing their location right now.</p>
              </div>
            ) : (
              <div style={S.contactList}>
                {contactLocs.map((loc) => (
                  <div key={loc._id} style={S.contactRow}>
                    <div style={S.contactLeft}>
                      <div style={S.avatar}>{loc.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <p style={S.contactName}>{loc.name}</p>
                        <p style={S.contactPhone}>📞 {loc.phone}</p>
                        <p style={S.contactTime}>🕐 Updated: {fmt(loc.timestamp)}</p>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={S.navBtn}
                    >
                      🗺️ Navigate
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
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
  desc: { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" },

  tabBar: { display: "flex", gap: 8, background: "#f3e8ff", borderRadius: 14, padding: 5, marginBottom: 24 },
  tabBtn: {
    flex: 1, padding: "11px", border: "none", borderRadius: 10,
    background: "transparent", cursor: "pointer", fontSize: 13,
    fontFamily: "sans-serif", color: "#9d6b9d",
  },
  tabActive: {
    background: "#ffffff", color: "#7c3aed",
    boxShadow: "0 2px 10px rgba(124,58,237,0.13)", fontWeight: 600,
  },

  statusCard: {
    background: "rgba(255,255,255,0.97)", borderRadius: 16, padding: "20px 24px",
    border: "1px solid #f3e8ff", boxShadow: "0 4px 20px rgba(157,107,157,0.09)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 16, marginBottom: 16,
  },
  statusLeft: { display: "flex", alignItems: "center", gap: 14 },
  dot: { width: 14, height: 14, borderRadius: "50%", flexShrink: 0, transition: "all 0.3s" },
  statusLabel: { margin: 0, fontSize: 15, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600 },
  statusCoords: { margin: "4px 0 0", fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" },
  statusBtns: { display: "flex", gap: 10, flexWrap: "wrap" },

  startBtn: {
    padding: "10px 22px", background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff", border: "none", borderRadius: 20, cursor: "pointer",
    fontSize: 13, fontFamily: "sans-serif",
  },
  stopBtn: {
    padding: "10px 22px", background: "#f43f5e",
    color: "#fff", border: "none", borderRadius: 20, cursor: "pointer",
    fontSize: 13, fontFamily: "sans-serif",
  },
  mapsBtn: {
    padding: "10px 22px", background: "transparent",
    color: "#7c3aed", border: "1.5px solid #e9d5ff",
    borderRadius: 20, cursor: "pointer", fontSize: 13,
    fontFamily: "sans-serif", textDecoration: "none",
    display: "inline-flex", alignItems: "center",
  },

  infoNote: {
    background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12,
    padding: "12px 16px", fontSize: 13, color: "#166534",
    fontFamily: "sans-serif", marginBottom: 16, lineHeight: 1.6,
  },
  idleNote: {
    textAlign: "center", fontSize: 13, color: "#9d6b9d",
    fontFamily: "sans-serif", marginTop: 16, lineHeight: 1.7,
  },

  mapWrap: {
    height: 420, borderRadius: 16,
    overflow: "hidden", border: "1px solid #f3e8ff",
    boxShadow: "0 8px 40px rgba(157,107,157,0.13)", marginBottom: 20,
  },

  emptyBox: { textAlign: "center", padding: "40px 20px" },
  emptyIcon: { fontSize: 40, margin: "0 0 10px" },
  emptyText: { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14 },

  contactList: { display: "flex", flexDirection: "column", gap: 12 },
  contactRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "rgba(255,255,255,0.97)", borderRadius: 14, padding: "14px 20px",
    border: "1px solid #f3e8ff", boxShadow: "0 2px 12px rgba(157,107,157,0.08)",
    flexWrap: "wrap", gap: 12,
  },
  contactLeft: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: "50%",
    background: "linear-gradient(135deg,#e879a8,#c084c4)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontFamily: "sans-serif", fontWeight: 600,
  },
  contactName: { margin: 0, fontSize: 14, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600 },
  contactPhone: { margin: "2px 0 0", fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" },
  contactTime: { margin: "2px 0 0", fontSize: 11, color: "#c084c4", fontFamily: "sans-serif" },
  navBtn: {
    padding: "8px 18px", background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff", borderRadius: 20, fontSize: 12,
    fontFamily: "sans-serif", textDecoration: "none",
  },
};