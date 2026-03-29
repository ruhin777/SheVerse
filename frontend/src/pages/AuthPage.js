import { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/auth";

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    if (!isLogin && !form.name) { setError("Name is required."); return; }
    setLoading(true);
    try {
      const url = isLogin ? `${API}/login` : `${API}/register`;
      const { data } = await axios.post(url, form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrapper}>

      {/* ── LEFT SIDE — Hero Image + Quote ── */}
      <div style={S.left}>
        {/* Dark overlay */}
        <div style={S.leftOverlay} />

        {/* Content */}
        <div style={S.leftContent}>
          {/* Logo */}
          <p style={S.brand}>SheVerse</p>

          {/* Quote */}
          <div style={S.quoteBlock}>
            <div style={S.quoteLine} />
            <h1 style={S.quote}>
              "She is not just a woman —<br />
              she is a universe<br />
              unto herself."
            </h1>
            <div style={S.quoteLine} />
          </div>

          <p style={S.subQuote}>
            A complete ecosystem designed for women.<br />
            Travel. Connect. Thrive.
          </p>

          {/* Features */}
          <div style={S.features}>
            {["Safe Travel Planning", "Women's Health & Wellness", "Social Networking", "Emergency Safety"].map(f => (
              <div key={f} style={S.featureItem}>
                <div style={S.featureDot} />
                <span style={S.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE — Auth Form ── */}
      <div style={S.right}>
        <div style={S.formBox}>

          {/* Header */}
          <div style={S.formHeader}>
            <p style={S.formSub}>WELCOME TO SHEVERSE</p>
            <h2 style={S.formTitle}>{isLogin ? "Sign In" : "Create Account"}</h2>
            <div style={S.formDivider} />
          </div>

          {/* Tabs */}
          <div style={S.tabs}>
            <button
              style={{ ...S.tab, ...(isLogin ? S.tabActive : {}) }}
              onClick={() => { setIsLogin(true); setError(""); }}
            >
              Sign In
            </button>
            <button
              style={{ ...S.tab, ...(!isLogin ? S.tabActive : {}) }}
              onClick={() => { setIsLogin(false); setError(""); }}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <div style={S.form}>
            {!isLogin && (
              <div style={S.inputGroup}>
                <label style={S.label}>FULL NAME</label>
                <input
                  style={S.input}
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}

            <div style={S.inputGroup}>
              <label style={S.label}>EMAIL ADDRESS</label>
              <input
                style={S.input}
                placeholder="your@email.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div style={S.inputGroup}>
              <label style={S.label}>PASSWORD</label>
              <input
                style={S.input}
                placeholder="••••••••"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {!isLogin && (
              <div style={S.inputGroup}>
                <label style={S.label}>PHONE NUMBER <span style={{ color: "#c084c4" }}>(optional)</span></label>
                <input
                  style={S.input}
                  placeholder="+880 ..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            )}

            {error && <p style={S.error}>{error}</p>}

            <button
              style={S.btn}
              onClick={handleSubmit}
              disabled={loading}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </div>

          {/* Switch */}
          <p style={S.switch}>
            {isLogin ? "New to SheVerse? " : "Already a member? "}
            <span
              style={S.switchLink}
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
            >
              {isLogin ? "Create an account" : "Sign in here"}
            </span>
          </p>

          {/* Footer */}
          <p style={S.footerText}>
            A safe space for every woman to explore, connect and grow.
          </p>
        </div>
      </div>
    </div>
  );
}

const S = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Georgia', serif",
  },

  // ── LEFT ──
  left: {
    flex: 1.2,
    position: "relative",
    backgroundImage: "url('https://i.pinimg.com/1200x/37/ed/7c/37ed7ca67966598308188039b58346bf.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  leftOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, rgba(60,0,80,0.72) 0%, rgba(120,30,80,0.55) 100%)",
  },
  leftContent: {
    position: "relative",
    zIndex: 1,
    padding: "60px 56px",
    maxWidth: 560,
  },
  brand: {
    fontSize: 13,
    letterSpacing: 6,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "sans-serif",
    marginBottom: 60,
    textTransform: "uppercase",
  },
  quoteBlock: {
    marginBottom: 32,
  },
  quoteLine: {
    width: 48,
    height: 1,
    background: "rgba(255,192,203,0.6)",
    marginBottom: 24,
  },
  quote: {
    fontSize: 32,
    fontWeight: 400,
    color: "#ffffff",
    lineHeight: 1.55,
    margin: "0 0 24px",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  subQuote: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.8,
    marginBottom: 48,
    fontFamily: "sans-serif",
    letterSpacing: 0.5,
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "rgba(255,192,203,0.8)",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "sans-serif",
    letterSpacing: 1,
  },

  // ── RIGHT ──
  right: {
    flex: 1,
    background: "#fdf8ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 32px",
    minHeight: "100vh",
  },
  formBox: {
    width: "100%",
    maxWidth: 400,
  },
  formHeader: {
    marginBottom: 28,
  },
  formSub: {
    fontSize: 10,
    letterSpacing: 4,
    color: "#c084c4",
    fontFamily: "sans-serif",
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 400,
    color: "#3b0764",
    margin: "0 0 16px",
    letterSpacing: 1,
  },
  formDivider: {
    width: 40,
    height: 2,
    background: "linear-gradient(90deg,#c084c4,#e879a8)",
  },
  tabs: {
    display: "flex",
    marginBottom: 28,
    background: "#f3e8ff",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: "10px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "sans-serif",
    color: "#9d6b9d",
    letterSpacing: 1,
    transition: "0.3s",
  },
  tabActive: {
    background: "#ffffff",
    color: "#7c3aed",
    boxShadow: "0 2px 8px rgba(124,58,237,0.15)",
    fontWeight: 600,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#c084c4",
    fontFamily: "sans-serif",
  },
  input: {
    padding: "12px 16px",
    border: "1px solid #e9d5ff",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    fontFamily: "sans-serif",
    background: "#ffffff",
    color: "#3b0764",
    transition: "border 0.2s",
  },
  error: {
    color: "#be185d",
    fontSize: 13,
    fontFamily: "sans-serif",
    textAlign: "center",
  },
  btn: {
    padding: "14px",
    background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "sans-serif",
    letterSpacing: 2,
    marginTop: 4,
    transition: "opacity 0.2s",
  },
  switch: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#9d6b9d",
    fontFamily: "sans-serif",
  },
  switchLink: {
    color: "#7c3aed",
    cursor: "pointer",
    textDecoration: "underline",
  },
  footerText: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 11,
    color: "#c084c4",
    fontFamily: "sans-serif",
    letterSpacing: 1,
    lineHeight: 1.6,
    borderTop: "1px solid #f3e8ff",
    paddingTop: 20,
  },
};