import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_MESSAGES = "http://localhost:5000/api/messages";
const API_PROFILE  = "http://localhost:5000/api/profile";
const SOCKET_URL   = "http://localhost:5000";

// ── Connect to Socket.io server once (module-level, not inside component) ──
const socket = io(SOCKET_URL, { autoConnect: false });

// ── Helpers ──
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
         " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + "…" : str;
}

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function MessagePage() {
  const me = JSON.parse(localStorage.getItem("user") || "{}");

  // ── State ──
  const [conversations, setConversations]   = useState([]);   // sidebar list
  const [activeChat, setActiveChat]         = useState(null);  // { otherId, username, photo }
  const [messages, setMessages]             = useState([]);    // messages in open chat
  const [inputText, setInputText]           = useState("");
  const [searchQ, setSearchQ]               = useState("");
  const [searchResults, setSearchResults]   = useState([]);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [myProfile, setMyProfile]           = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // ── Auto-scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ════════════════════════════════════════════════════════
  //  SOCKET.IO SETUP
  // ════════════════════════════════════════════════════════
  useEffect(() => {
    if (!me._id) return;

    // Connect and register with server
    socket.connect();
    socket.emit("register", me._id);

    // Listen for incoming messages
    socket.on("receiveMessage", (msg) => {
      // If the message belongs to the currently open chat, add it to the view
      setActiveChat(prev => {
        if (
          prev &&
          ((msg.senderId.toString() === prev.otherId && msg.receiverId.toString() === me._id) ||
           (msg.senderId.toString() === me._id       && msg.receiverId.toString() === prev.otherId))
        ) {
          setMessages(old => {
            // Avoid duplicate if already added optimistically
            const exists = old.some(m => m._id?.toString() === msg._id?.toString());
            return exists ? old : [...old, msg];
          });
        }
        return prev;
      });

      // Refresh sidebar conversations so last message updates
      fetchConversations();
    });

    // Fetch my profile photo once
    axios.get(`${API_PROFILE}/${me._id}`).then(({ data }) => setMyProfile(data)).catch(() => {});

    return () => {
      socket.off("receiveMessage");
      socket.disconnect();
    };
  }, [me._id]);

  // ════════════════════════════════════════════════════════
  //  DATA FETCHERS
  // ════════════════════════════════════════════════════════
  const fetchConversations = useCallback(async () => {
    if (!me._id) return;
    try {
      const { data } = await axios.get(`${API_MESSAGES}/conversations/${me._id}`);
      setConversations(data);
    } catch (e) { console.error("fetchConversations", e); }
  }, [me._id]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const fetchMessages = async (otherId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await axios.get(`${API_MESSAGES}/${me._id}/${otherId}`);
      setMessages(data);
    } catch (e) { console.error("fetchMessages", e); }
    finally { setLoadingMsgs(false); }
  };

  // ════════════════════════════════════════════════════════
  //  SEARCH
  // ════════════════════════════════════════════════════════
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${API_PROFILE}/search/users?q=${encodeURIComponent(searchQ)}&currentUserId=${me._id}`
        );
        setSearchResults(data);
      } catch (e) { console.error("search", e); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, me._id]);

  // ════════════════════════════════════════════════════════
  //  OPEN A CHAT
  // ════════════════════════════════════════════════════════
  const openChat = async (otherId, username, photo) => {
    setActiveChat({ otherId, username, photo });
    setSearchQ("");
    setSearchResults([]);
    await fetchMessages(otherId);
    // Mark this conversation at top of sidebar
    fetchConversations();
    inputRef.current?.focus();
  };

  // ════════════════════════════════════════════════════════
  //  SEND MESSAGE
  // ════════════════════════════════════════════════════════
  const handleSend = () => {
    const content = inputText.trim();
    if (!content || !activeChat) return;

    // Emit via Socket.io — server saves to DB and emits back to both users
    socket.emit("sendMessage", {
      senderId:   me._id,
      receiverId: activeChat.otherId,
      content,
    });

    setInputText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div style={S.pageWrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.chatShell}>

        {/* ══════════════════════════════════
            LEFT SIDEBAR
        ══════════════════════════════════ */}
        <div style={S.sidebar}>

          {/* Header */}
          <div style={S.sidebarHeader}>
            <span style={S.sidebarTitle}>Messages</span>
          </div>

          {/* Search Bar */}
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              style={S.searchInput}
              placeholder="Search people..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
            {searchQ && (
              <button style={S.clearBtn} onClick={() => { setSearchQ(""); setSearchResults([]); }}>✕</button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div style={S.searchDropdown}>
              {searchResults.map(u => (
                <div
                  key={u.userId}
                  style={S.searchResultItem}
                  onClick={() => openChat(u.userId.toString(), u.username, u.photo)}
                  onMouseEnter={e => e.currentTarget.style.background = "#f3e8ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <AvatarCircle photo={u.photo} name={u.username} size={38} />
                  <span style={S.searchResultName}>{u.username}</span>
                </div>
              ))}
            </div>
          )}

          {searchQ.trim() && searchResults.length === 0 && (
            <div style={S.noResults}>No users found</div>
          )}

          {/* Conversation List */}
          <div style={S.convList}>
            {conversations.length === 0 && !searchQ && (
              <div style={S.emptyConv}>
                <div style={S.emptyIcon}>💬</div>
                <p style={S.emptyText}>No conversations yet.</p>
                <p style={S.emptySubText}>Search for someone above to start chatting!</p>
              </div>
            )}

            {conversations.map(conv => {
              const isActive  = activeChat?.otherId === conv.otherId.toString();
              const isFromMe  = conv.lastSenderId?.toString() === me._id;
              const preview   = isFromMe
                ? "You: " + truncate(conv.lastMessage, 22)
                : truncate(conv.lastMessage, 28);

              return (
                <div
                  key={conv.otherId.toString()}
                  style={{
                    ...S.convItem,
                    background: isActive ? "linear-gradient(135deg,#f3e8ff,#fdf4ff)" : "transparent",
                    borderLeft: isActive ? "3px solid #9d4edd" : "3px solid transparent",
                  }}
                  onClick={() => openChat(conv.otherId.toString(), conv.username, conv.photo)}
                >
                  <AvatarCircle photo={conv.photo} name={conv.username} size={46} />
                  <div style={S.convInfo}>
                    <div style={S.convName}>{conv.username}</div>
                    <div style={S.convPreview}>{preview}</div>
                  </div>
                  <div style={S.convTime}>{formatTime(conv.lastTimestamp)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════
            RIGHT CHAT AREA
        ══════════════════════════════════ */}
        <div style={S.chatArea}>

          {!activeChat ? (
            /* Empty state — no chat selected */
            <div style={S.noChatSelected}>
              <div style={S.noChatIcon}>✉️</div>
              <h2 style={S.noChatTitle}>Your Messages</h2>
              <p style={S.noChatSub}>Search for a friend and start a private conversation.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={S.chatHeader}>
                <AvatarCircle photo={activeChat.photo} name={activeChat.username} size={40} />
                <div style={S.chatHeaderInfo}>
                  <div style={S.chatHeaderName}>{activeChat.username}</div>
                  <div style={S.chatHeaderStatus}>Active now</div>
                </div>
              </div>

              {/* Messages Area */}
              <div style={S.messagesArea}>
                {loadingMsgs && (
                  <div style={S.loadingText}>Loading messages...</div>
                )}

                {!loadingMsgs && messages.length === 0 && (
                  <div style={S.noMessagesYet}>
                    <AvatarCircle photo={activeChat.photo} name={activeChat.username} size={64} />
                    <p style={S.noMsgName}>{activeChat.username}</p>
                    <p style={S.noMsgSub}>Say hello! 👋</p>
                  </div>
                )}

                {/* Render messages grouped by date */}
                {!loadingMsgs && renderMessagesWithDates(messages, me._id, myProfile, activeChat)}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div style={S.inputBar}>
                <input
                  ref={inputRef}
                  style={S.messageInput}
                  placeholder={`Message ${activeChat.username}...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  style={{
                    ...S.sendBtn,
                    opacity: inputText.trim() ? 1 : 0.5,
                    cursor:  inputText.trim() ? "pointer" : "default",
                  }}
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
//  HELPER — Render messages with date separators
// ════════════════════════════════════════════════════════
function renderMessagesWithDates(messages, myId, myProfile, activeChat) {
  const elements = [];
  let lastDateStr = null;

  for (let i = 0; i < messages.length; i++) {
    const msg      = messages[i];
    const isMe     = msg.senderId?.toString() === myId;
    const d        = new Date(msg.timestamp);
    const dateStr  = d.toDateString();

    // Date separator
    if (dateStr !== lastDateStr) {
      lastDateStr = dateStr;
      const now      = new Date();
      const isToday  = dateStr === now.toDateString();
      const label    = isToday
        ? "Today"
        : d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

      elements.push(
        <div key={`date-${i}`} style={S.dateSeparator}>
          <div style={S.dateLine} />
          <span style={S.dateLabel}>{label}</span>
          <div style={S.dateLine} />
        </div>
      );
    }

    // Message bubble
    elements.push(
      <div
        key={msg._id || i}
        style={{
          ...S.msgRow,
          flexDirection: isMe ? "row-reverse" : "row",
        }}
      >
        {/* Avatar — only show for receiver's messages */}
        {!isMe && (
          <AvatarCircle
            photo={activeChat.photo}
            name={activeChat.username}
            size={30}
          />
        )}

        <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
          <div
            style={{
              ...S.bubble,
              background:   isMe ? "linear-gradient(135deg, #9d4edd, #c084c4)" : "#fff",
              color:        isMe ? "#fff" : "#3b0764",
              borderRadius: isMe
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px",
              boxShadow: isMe
                ? "0 2px 8px rgba(157,107,157,0.35)"
                : "0 2px 8px rgba(157,107,157,0.12)",
            }}
          >
            {msg.content}
          </div>
          <span style={{ ...S.msgTime, textAlign: isMe ? "right" : "left" }}>
            {formatTime(msg.timestamp)}
          </span>
        </div>

        {/* My avatar — only show on my side */}
        {isMe && (
          <AvatarCircle
            photo={myProfile?.photo}
            name={myProfile?.username || "Me"}
            size={30}
          />
        )}
      </div>
    );
  }

  return elements;
}

// ════════════════════════════════════════════════════════
//  AVATAR COMPONENT
// ════════════════════════════════════════════════════════
function AvatarCircle({ photo, name, size }) {
  const style = {
    width:       size,
    height:      size,
    borderRadius: "50%",
    flexShrink:  0,
    overflow:    "hidden",
    background:  "linear-gradient(135deg, #e879a8, #c084c4)",
    display:     "flex",
    alignItems:  "center",
    justifyContent: "center",
    fontSize:    size * 0.38,
    fontWeight:  "bold",
    color:       "#fff",
    fontFamily:  "sans-serif",
  };

  if (photo) {
    return (
      <div style={style}>
        <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={style}>{(name || "U")[0].toUpperCase()}</div>
  );
}

// ════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════
const S = {
  pageWrapper: {
    position: "relative",
    minHeight: "100vh",
    fontFamily: "Georgia, serif",
    display: "flex",
    alignItems: "stretch",
  },
  bg: {
    position: "fixed", inset: 0,
    backgroundImage: "url('https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg')",
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "blur(0.5px)", transform: "scale(1.1)", zIndex: -2,
  },
  overlay: { position: "fixed", inset: 0, background: "rgba(255,245,250,0.75)", zIndex: -1 },

  // ── Shell: sidebar + chat side by side ──
  chatShell: {
    display: "flex",
    width: "100%",
    maxWidth: 1000,
    margin: "24px auto",
    height: "calc(100vh - 84px)",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 12px 40px rgba(157,107,157,0.2)",
    border: "1px solid #f3e8ff",
    position: "relative",
    zIndex: 1,
  },

  // ══ SIDEBAR ══
  sidebar: {
    width: 320,
    minWidth: 280,
    background: "#fff",
    borderRight: "1px solid #f3e8ff",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: "20px 20px 14px",
    borderBottom: "1px solid #f3e8ff",
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#3b0764",
    fontFamily: "Georgia, serif",
  },

  searchWrap: {
    margin: "10px 14px",
    display: "flex",
    alignItems: "center",
    background: "#f9f0ff",
    borderRadius: 24,
    padding: "0 12px",
    border: "1px solid #e9d5ff",
  },
  searchIcon: { fontSize: 14, opacity: 0.6, marginRight: 6 },
  searchInput: {
    flex: 1, border: "none", outline: "none",
    background: "transparent", padding: "10px 0",
    fontSize: 14, fontFamily: "sans-serif", color: "#3b0764",
  },
  clearBtn: {
    background: "transparent", border: "none",
    cursor: "pointer", color: "#9d6b9d", fontSize: 13, padding: 0,
  },

  searchDropdown: {
    margin: "0 14px",
    background: "#fff",
    border: "1px solid #e9d5ff",
    borderRadius: 12,
    boxShadow: "0 8px 20px rgba(157,107,157,0.15)",
    zIndex: 10,
    overflow: "hidden",
  },
  searchResultItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", cursor: "pointer",
    transition: "background 0.15s",
  },
  searchResultName: {
    fontSize: 14, fontFamily: "sans-serif", color: "#3b0764", fontWeight: 500,
  },
  noResults: {
    textAlign: "center", color: "#9d6b9d",
    fontSize: 13, fontFamily: "sans-serif", padding: "8px 0 4px",
  },

  convList: {
    flex: 1,
    overflowY: "auto",
    paddingTop: 6,
  },
  emptyConv: {
    textAlign: "center", padding: "40px 20px",
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: "#3b0764", fontFamily: "sans-serif", fontSize: 15, margin: "0 0 6px", fontWeight: 600 },
  emptySubText: { color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 13, margin: 0 },

  convItem: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", cursor: "pointer",
    transition: "background 0.15s",
    borderBottom: "1px solid #fdf4ff",
  },
  convInfo: { flex: 1, minWidth: 0 },
  convName: {
    fontSize: 14, fontFamily: "sans-serif", color: "#3b0764",
    fontWeight: 600, marginBottom: 2,
  },
  convPreview: {
    fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  convTime: {
    fontSize: 10, fontFamily: "sans-serif", color: "#c084c4",
    flexShrink: 0, marginLeft: 4,
  },

  // ══ CHAT AREA ══
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#fdf4ff",
    overflow: "hidden",
  },

  noChatSelected: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: 40, textAlign: "center",
  },
  noChatIcon:  { fontSize: 56, marginBottom: 16 },
  noChatTitle: { fontSize: 24, color: "#3b0764", fontFamily: "Georgia, serif", margin: "0 0 10px" },
  noChatSub:   { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", margin: 0, lineHeight: 1.7 },

  chatHeader: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 20px",
    background: "#fff",
    borderBottom: "1px solid #f3e8ff",
    boxShadow: "0 2px 8px rgba(157,107,157,0.08)",
  },
  chatHeaderInfo: {},
  chatHeaderName: {
    fontSize: 15, fontFamily: "sans-serif", color: "#3b0764", fontWeight: 700,
  },
  chatHeaderStatus: {
    fontSize: 11, fontFamily: "sans-serif", color: "#22c55e",
  },

  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  loadingText: {
    textAlign: "center", color: "#9d6b9d",
    fontFamily: "sans-serif", fontSize: 13, padding: "20px 0",
  },
  noMessagesYet: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "40px 0",
  },
  noMsgName: {
    fontSize: 16, fontFamily: "sans-serif", color: "#3b0764",
    fontWeight: 600, margin: "10px 0 4px",
  },
  noMsgSub: {
    fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif", margin: 0,
  },

  dateSeparator: {
    display: "flex", alignItems: "center", gap: 10, margin: "12px 0 8px",
  },
  dateLine: { flex: 1, height: 1, background: "#e9d5ff" },
  dateLabel: {
    fontSize: 11, color: "#c084c4", fontFamily: "sans-serif",
    whiteSpace: "nowrap", letterSpacing: 0.5,
  },

  msgRow: {
    display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 4,
  },
  bubble: {
    padding: "10px 14px",
    fontSize: 14, fontFamily: "sans-serif", lineHeight: 1.5,
    wordBreak: "break-word",
    maxWidth: "100%",
  },
  msgTime: {
    fontSize: 10, color: "#9d6b9d", fontFamily: "sans-serif",
    marginTop: 3, paddingLeft: 4, paddingRight: 4,
  },

  inputBar: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 16px",
    background: "#fff",
    borderTop: "1px solid #f3e8ff",
  },
  messageInput: {
    flex: 1,
    padding: "12px 18px",
    borderRadius: 24,
    border: "1px solid #e9d5ff",
    fontFamily: "sans-serif", fontSize: 14, color: "#3b0764",
    outline: "none",
    background: "#f9f0ff",
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #c084c4, #9d4edd)",
    color: "#fff",
    fontSize: 18,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(157,107,157,0.35)",
    transition: "opacity 0.2s",
  },
};