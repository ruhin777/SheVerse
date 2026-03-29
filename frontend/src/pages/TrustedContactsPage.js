import { useEffect, useState } from "react";
import API from "../services/api";

export default function TrustedContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const fetchContacts = async () => {
    try {
      const res = await API.get("/api/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(res.data);
    } catch (_) {}
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSubmit = async () => {
    setStatus(null);
    if (!form.name || !form.phone) {
      setStatus("error");
      setMessage("Both name and phone number are required.");
      return;
    }
    try {
      if (editingId) {
        await API.put(`/api/contacts/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEditingId(null);
        setStatus("success");
        setMessage("Contact updated successfully.");
      } else {
        await API.post("/api/contacts", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus("success");
        setMessage("Contact added successfully.");
      }
      setForm({ name: "", phone: "" });
      fetchContacts();
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Something went wrong.");
    }
  };

  const handleEdit = (contact) => {
    setForm({ name: contact.name, phone: contact.phone });
    setEditingId(contact._id);
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setForm({ name: "", phone: "" });
    setEditingId(null);
    setStatus(null);
  };

  const deleteContact = async (id) => {
    try {
      await API.delete(`/api/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus("success");
      setMessage("Contact removed.");
      fetchContacts();
    } catch (_) {}
  };

  return (
    <div style={S.wrapper}>
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.sub}>SAFETY NETWORK</p>
          <h1 style={S.title}>Trusted Contacts</h1>
          <div style={S.divider} />
          <p style={S.desc}>
            Add people you trust. They can be reached in emergencies or when you share your live location.
          </p>
        </div>

        {/* Form Card */}
        <div style={S.card}>
          <p style={S.cardTitle}>
            {editingId ? "✏️ Edit Contact" : "➕ Add New Contact"}
          </p>
          <div style={S.sep} />

          <div style={S.fieldGroup}>
            <label style={S.label}>FULL NAME <span style={S.req}>*</span></label>
            <input
              style={S.input}
              placeholder="e.g. Mitali"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div style={S.fieldGroup}>
            <label style={S.label}>PHONE NUMBER <span style={S.req}>*</span></label>
            <input
              style={S.input}
              placeholder="e.g. 01700 000000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {status && (
            <div style={{
              ...S.statusBox,
              background: status === "success" ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${status === "success" ? "#bbf7d0" : "#fecdd3"}`,
              color: status === "success" ? "#166534" : "#9f1239",
            }}>
              <span>{status === "success" ? "✅" : "⚠️"}</span>
              {message}
            </div>
          )}

          <div style={S.btnRow}>
            <button style={S.submitBtn} onClick={handleSubmit}>
              {editingId ? "Update Contact" : "Add Contact"}
            </button>
            {editingId && (
              <button style={S.cancelBtn} onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Contact List */}
        <div style={S.listHeader}>
          <p style={S.listTitle}>Your Contacts ({contacts.length})</p>
        </div>

        {contacts.length === 0 ? (
          <div style={S.emptyBox}>
            <p style={S.emptyIcon}>👥</p>
            <p style={S.emptyText}>No trusted contacts added yet.</p>
          </div>
        ) : (
          <div style={S.grid}>
            {contacts.map((c) => (
              <div key={c._id} style={S.contactCard}>
                <div style={S.contactLeft}>
                  <div style={S.avatar}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={S.name}>{c.name}</h3>
                    <p style={S.phone}>📞 {c.phone}</p>
                  </div>
                </div>
                <div style={S.actions}>
                  <button style={S.editBtn} onClick={() => handleEdit(c)}>
                    Edit
                  </button>
                  <button style={S.deleteBtn} onClick={() => deleteContact(c._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  wrapper: {
    minHeight: "100vh",
    background: "rgba(255,245,250,0.85)",
    fontFamily: "'Georgia', serif",
  },

  page: { maxWidth: 780, margin: "0 auto", padding: "40px 24px 60px" },

  header: { textAlign: "center", marginBottom: 32 },
  sub: { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 400, color: "#3b0764", margin: "0 0 14px" },
  divider: { width: 48, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  desc: { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", lineHeight: 1.7, maxWidth: 460, margin: "0 auto" },

  card: {
    background: "rgba(255,255,255,0.97)",
    borderRadius: 20,
    padding: "28px 32px",
    boxShadow: "0 8px 40px rgba(157,107,157,0.13)",
    border: "1px solid #f3e8ff",
    marginBottom: 32,
  },

  cardTitle: {
    fontSize: 15,
    color: "#3b0764",
    fontFamily: "sans-serif",
    fontWeight: 600,
    margin: "0 0 12px",
  },

  sep: { height: 1, background: "#f3e8ff", margin: "0 0 22px" },

  fieldGroup: { marginBottom: 18 },
  label: { display: "block", fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  req: { color: "#e879a8" },
  input: {
    width: "100%",
    padding: "13px 16px",
    border: "1.5px solid #e9d5ff",
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "sans-serif",
    color: "#3b0764",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },

  statusBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 12,
    fontSize: 13,
    fontFamily: "sans-serif",
    marginBottom: 16,
  },

  btnRow: { display: "flex", gap: 10 },

  submitBtn: {
    flex: 1,
    padding: "13px",
    background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "sans-serif",
    letterSpacing: 1,
  },

  cancelBtn: {
    padding: "13px 20px",
    background: "transparent",
    color: "#9d4edd",
    border: "1.5px solid #e9d5ff",
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "sans-serif",
  },

  listHeader: { marginBottom: 14 },
  listTitle: { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 1 },

  emptyBox: { textAlign: "center", padding: "50px 20px" },
  emptyIcon: { fontSize: 40, margin: "0 0 10px" },
  emptyText: { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 14 },

  grid: { display: "flex", flexDirection: "column", gap: 12 },

  contactCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 4px 20px rgba(157,107,157,0.09)",
    border: "1px solid #f3e8ff",
    flexWrap: "wrap",
    gap: 12,
  },

  contactLeft: { display: "flex", alignItems: "center", gap: 14 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#7c3aed,#c084c4)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontFamily: "sans-serif",
    fontWeight: 600,
    flexShrink: 0,
  },

  name: { margin: 0, fontSize: 15, color: "#3b0764", fontFamily: "sans-serif", fontWeight: 600 },
  phone: { margin: "4px 0 0", fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif" },

  actions: { display: "flex", gap: 8 },

  editBtn: {
    padding: "7px 16px",
    borderRadius: 20,
    border: "1.5px solid #9d4edd",
    background: "transparent",
    color: "#9d4edd",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "sans-serif",
  },

  deleteBtn: {
    padding: "7px 16px",
    borderRadius: 20,
    border: "none",
    background: "#f43f5e",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "sans-serif",
  },
};