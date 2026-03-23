import { useEffect, useState } from "react";
import API from "../services/api";

export default function TrustedContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("token");

  // 🔄 Fetch contacts
  const fetchContacts = async () => {
    const res = await API.get("/api/contacts", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setContacts(res.data);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // ➕ Add OR Update
  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;

    if (editingId) {
      // UPDATE
      await API.put(`/api/contacts/${editingId}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingId(null);
    } else {
      // CREATE
      await API.post("/api/contacts", form, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    setForm({ name: "", phone: "" });
    fetchContacts();
  };

  // ✏️ Edit
  const handleEdit = (contact) => {
    setForm({ name: contact.name, phone: contact.phone });
    setEditingId(contact._id);
  };

  // ❌ Delete
  const deleteContact = async (id) => {
    await API.delete(`/api/contacts/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchContacts();
  };

  return (
    <div style={S.wrapper}>
      <div style={S.overlay} />

      <div style={S.page}>
        {/* Header */}
        <div style={S.header}>
          <p style={S.sub}>SAFETY NETWORK</p>
          <h1 style={S.title}>Trusted Contacts</h1>
          <div style={S.divider} />
        </div>

        {/* Form */}
        <div style={S.formBox}>
          <input
            style={S.input}
            placeholder="Contact Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            style={S.input}
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <button style={S.addBtn} onClick={handleSubmit}>
            {editingId ? "Update Contact" : "Add Contact"}
          </button>
        </div>

        {/* List */}
        <div style={S.grid}>
          {contacts.map((c) => (
            <div key={c._id} style={S.card}>
              <div>
                <h3 style={S.name}>{c.name}</h3>
                <p style={S.phone}>{c.phone}</p>
              </div>

              {/* RIGHT SIDE BUTTONS */}
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
      </div>
    </div>
  );
}

const S = {
  wrapper: { minHeight: "100vh", position: "relative", fontFamily: "'Georgia', serif" },
  overlay: { position: "fixed", inset: 0, background: "rgba(255,245,250,0.85)", zIndex: -1 },

  page: { maxWidth: 900, margin: "auto", padding: "40px 24px" },

  header: { textAlign: "center", marginBottom: 30 },
  sub: { fontSize: 11, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif" },
  title: { fontSize: 32, color: "#4a2060", margin: "10px 0" },
  divider: { width: 50, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "auto" },

  formBox: { display: "flex", gap: 10, marginBottom: 30, flexWrap: "wrap", justifyContent: "center" },
  input: {
    padding: "12px 16px",
    borderRadius: 20,
    border: "1px solid #e9d5ff",
    fontFamily: "sans-serif",
    width: 200
  },
  addBtn: {
    padding: "12px 20px",
    background: "linear-gradient(135deg,#9d4edd,#c77dff)",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    cursor: "pointer"
  },

  grid: { display: "flex", flexDirection: "column", gap: 12 },

  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
  },

  name: { margin: 0, color: "#3b0764" },
  phone: { margin: 0, fontSize: 13, color: "#9d6b9d" },

  actions: { display: "flex", gap: 8 },

  editBtn: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "1px solid #9d4edd",
    background: "transparent",
    color: "#9d4edd",
    cursor: "pointer"
  },

  deleteBtn: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "none",
    background: "#f43f5e",
    color: "#fff",
    cursor: "pointer"
  }
};