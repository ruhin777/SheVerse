import { useState, useEffect, useRef } from "react";
import axios from "axios";

const SAVE_API = "http://localhost:5000/api/aibot";
const user = JSON.parse(localStorage.getItem("user") || "{}");
const USER_ID = user._id || "";
const USER_NAME = user.name || "there";

const SUGGESTED_QUESTIONS = [
  { icon:"🩸", text:"What are the symptoms of iron deficiency?" },
  { icon:"🧘", text:"How can I reduce period cramps naturally?" },
  { icon:"⚖️", text:"What BMI is considered healthy for women?" },
  { icon:"🥗", text:"What foods help with hormonal balance?" },
  { icon:"😴", text:"How does sleep affect women's health?" },
  { icon:"💊", text:"What vitamins should women take daily?" },
  { icon:"🏃", text:"Best exercises for weight loss for women?" },
  { icon:"🧠", text:"How to manage anxiety and stress naturally?" },
];

export default function AIBotPage() {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [history, setHistory]         = useState([]);
  const messagesEndRef                = useRef(null);
  const inputRef                      = useRef(null);

  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Hello ${USER_NAME}! 👋 I'm **Aria**, your AI health assistant from SheVerse.\n\nI'm here to help you with questions about women's health, nutrition, fitness, mental wellness and more. How can I help you today?`,
      time: new Date(),
    }]);
    fetchHistory();
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  };

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${SAVE_API}/history/${USER_ID}`);
      if (data.success) setHistory(data.history);
    } catch {}
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${SAVE_API}/history/${USER_ID}`);
      setHistory([]);
    } catch {}
  };

  const callAI = async (userMessage, conversationHistory) => {
    const response = await axios.post(`${SAVE_API}/ask`, {
      question: userMessage,
      userId: USER_ID,
      history: conversationHistory
        .filter(m => !m.isError)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content })),
    });
    if (!response.data.success) throw new Error("API failed");
    return response.data.answer;
  };

  const handleSend = async (messageText) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMsg = { role:"user", content:text, time:new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const aiResponse = await callAI(text, messages);
      setMessages(prev => [...prev, { role:"assistant", content:aiResponse, time:new Date() }]);
      fetchHistory();
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. 💙",
        time: new Date(),
        isError: true,
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content) => {
    return content.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} style={{ margin:"4px 0", lineHeight:1.7 }}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ fontWeight:700 }}>{part}</strong>
              : part
          )}
        </p>
      );
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
  };

  return (
    <div style={S.wrapper}>
      <style>{CSS}</style>

      {/* ── SIDEBAR ── */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <div style={S.ariaAvatar}>A</div>
          <div>
            <div style={S.ariaName}>Aria</div>
            <div style={S.ariaStatus}>
              <span style={S.statusDot}/>
              AI Health Assistant
            </div>
          </div>
        </div>

        <div style={S.sidebarDivider}/>

        <div style={S.sidebarSection}>
          <div style={S.sidebarSectionTitle}>💡 Quick Questions</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} className="suggestion-btn"
                onClick={() => handleSend(q.text)}
                style={S.suggestionBtn}>
                <span style={{ fontSize:"1rem", flexShrink:0 }}>{q.icon}</span>
                <span style={{ fontSize:"0.8rem", textAlign:"left", lineHeight:1.4 }}>{q.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={S.sidebarDivider}/>

        <div style={S.sidebarSection}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={S.sidebarSectionTitle}>📋 Recent Chats</div>
            {history.length > 0 && (
              <button onClick={clearHistory} style={S.clearBtn}>Clear</button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.4)", textAlign:"center", padding:"12px 0" }}>
              No chat history yet
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:200, overflowY:"auto" }}>
              {history.slice(0,8).map((h, i) => (
                <button key={i} className="history-btn"
                  onClick={() => handleSend(h.question)}
                  style={S.historyBtn}>
                  <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.8)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {h.question}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div style={S.chatArea}>

        {/* Header */}
        <div style={S.chatHeader}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={S.chatHeaderAvatar}>A</div>
            <div>
              <div style={S.chatHeaderName}>Aria — AI Health Assistant</div>
              <div style={S.chatHeaderSub}>
                <span style={S.statusDotGreen}/>
                Powered by Groq AI · Always available
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={S.headerBadge}>🔒 Private & Secure</div>
            <button className="new-chat-btn"
              onClick={() => setMessages([{
                role:"assistant",
                content:`Hello again, ${USER_NAME}! 👋 Starting a fresh conversation. What's on your mind?`,
                time:new Date(),
              }])}
              style={S.newChatBtn}>
              + New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={S.messagesArea}>
          {messages.map((msg, i) => (
            <div key={i} className="message-row"
              style={{ display:"flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom:20, gap:12, animationDelay:`${i*0.05}s` }}>

              {msg.role === "assistant" && (
                <div style={S.botAvatar}>A</div>
              )}

              <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ ...S.messageBubble, ...(msg.role === "user" ? S.userBubble : msg.isError ? S.errorBubble : S.botBubble) }}>
                  {msg.role === "assistant"
                    ? formatMessage(msg.content)
                    : <p style={{ margin:0, lineHeight:1.6 }}>{msg.content}</p>
                  }
                </div>
                <div style={S.messageTime}>{formatTime(msg.time)}</div>
              </div>

              {msg.role === "user" && (
                <div style={S.userAvatar}>{USER_NAME[0]?.toUpperCase() || "U"}</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:20 }} className="message-row">
              <div style={S.botAvatar}>A</div>
              <div style={{ ...S.messageBubble, ...S.botBubble, padding:"16px 20px" }}>
                <div style={S.typingDots}>
                  <span className="dot"/>
                  <span className="dot"/>
                  <span className="dot"/>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef}/>
        </div>

        {/* Input */}
        <div style={S.inputArea}>
          <div style={S.inputWrapper}>
            <textarea
              ref={inputRef}
              style={S.textarea}
              placeholder="Ask Aria anything about your health..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{ ...S.sendBtn, opacity: !input.trim() || loading ? 0.5 : 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={S.inputHint}>
            Press <kbd style={S.kbd}>Enter</kbd> to send · <kbd style={S.kbd}>Shift+Enter</kbd> for new line · Not medical advice
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
  @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
  .message-row { animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .suggestion-btn:hover { background:rgba(255,255,255,0.15)!important; transform:translateX(4px); }
  .history-btn:hover    { background:rgba(255,255,255,0.1)!important; }
  .new-chat-btn:hover   { background:rgba(255,255,255,0.2)!important; transform:translateY(-1px); }
  .send-btn:hover:not(:disabled) { transform:scale(1.08); box-shadow:0 8px 24px rgba(155,114,207,0.5)!important; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#c084b0; margin:0 3px; animation:dotBounce 1.2s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay:0.2s; }
  .dot:nth-child(3) { animation-delay:0.4s; }
`;

const S = {
  wrapper:          { display:"flex", height:"calc(100vh - 60px)", background:"#faf5ff", fontFamily:"Plus Jakarta Sans, sans-serif", overflow:"hidden" },
  sidebar:          { width:300, background:"linear-gradient(160deg,#1e0a2e 0%,#3b0764 60%,#6b3fa0 100%)", display:"flex", flexDirection:"column", padding:"24px 16px", overflowY:"auto", flexShrink:0 },
  sidebarHeader:    { display:"flex", alignItems:"center", gap:12, marginBottom:4, padding:"8px 8px 16px" },
  ariaAvatar:       { width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#9b72cf,#e8637a)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:"1.3rem", flexShrink:0, boxShadow:"0 4px 16px rgba(155,114,207,0.4)" },
  ariaName:         { fontFamily:"Cormorant Garamond, serif", fontSize:"1.3rem", fontWeight:700, color:"white" },
  ariaStatus:       { display:"flex", alignItems:"center", gap:6, fontSize:"0.75rem", color:"rgba(255,255,255,0.65)", marginTop:2 },
  statusDot:        { width:7, height:7, borderRadius:"50%", background:"#4caf78", boxShadow:"0 0 6px #4caf78", flexShrink:0 },
  statusDotGreen:   { width:7, height:7, borderRadius:"50%", background:"#4caf78", boxShadow:"0 0 6px #4caf78", flexShrink:0, display:"inline-block", marginRight:4 },
  sidebarDivider:   { height:1, background:"rgba(255,255,255,0.1)", margin:"8px 0" },
  sidebarSection:   { padding:"8px 0" },
  sidebarSectionTitle:{ fontSize:"0.7rem", fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:2, marginBottom:12 },
  suggestionBtn:    { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, cursor:"pointer", color:"rgba(255,255,255,0.85)", fontFamily:"Plus Jakarta Sans, sans-serif", transition:"all 0.2s", textAlign:"left", width:"100%" },
  historyBtn:       { padding:"8px 12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, cursor:"pointer", textAlign:"left", width:"100%", fontFamily:"Plus Jakarta Sans, sans-serif", transition:"all 0.2s", overflow:"hidden" },
  clearBtn:         { fontSize:"0.72rem", color:"rgba(255,255,255,0.45)", background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"3px 10px", cursor:"pointer", fontFamily:"Plus Jakarta Sans, sans-serif", transition:"all 0.2s" },
  chatArea:         { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  chatHeader:       { background:"white", borderBottom:"1px solid #f0e8fb", padding:"16px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 2px 12px rgba(107,63,160,0.06)" },
  chatHeaderAvatar: { width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#9b72cf,#e8637a)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:"1.2rem", boxShadow:"0 4px 12px rgba(155,114,207,0.3)" },
  chatHeaderName:   { fontFamily:"Cormorant Garamond, serif", fontSize:"1.2rem", fontWeight:700, color:"#3b0764" },
  chatHeaderSub:    { fontSize:"0.78rem", color:"#9d6b9d", display:"flex", alignItems:"center", marginTop:2 },
  headerBadge:      { fontSize:"0.75rem", color:"#4caf78", background:"#edfbf3", border:"1px solid #4caf7844", borderRadius:20, padding:"5px 14px", fontWeight:600 },
  newChatBtn:       { background:"rgba(107,63,160,0.1)", border:"1.5px solid rgba(107,63,160,0.2)", borderRadius:10, padding:"8px 18px", cursor:"pointer", fontSize:"0.85rem", color:"#6b3fa0", fontFamily:"Plus Jakarta Sans, sans-serif", fontWeight:600, transition:"all 0.2s" },
  messagesArea:     { flex:1, overflowY:"auto", padding:"28px 32px", display:"flex", flexDirection:"column" },
  botAvatar:        { width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#9b72cf,#e8637a)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:"0.9rem", flexShrink:0, alignSelf:"flex-start", marginTop:4, boxShadow:"0 4px 12px rgba(155,114,207,0.3)" },
  userAvatar:       { width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#6b3fa0,#c084b0)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:"0.9rem", flexShrink:0, alignSelf:"flex-start", marginTop:4 },
  messageBubble:    { padding:"14px 18px", borderRadius:20, fontSize:"0.92rem", lineHeight:1.7, maxWidth:"100%" },
  botBubble:        { background:"white", color:"#3b0764", borderRadius:"4px 20px 20px 20px", boxShadow:"0 2px 12px rgba(107,63,160,0.08)", border:"1px solid #f0e8fb" },
  userBubble:       { background:"linear-gradient(135deg,#9b72cf,#6b3fa0)", color:"white", borderRadius:"20px 4px 20px 20px", boxShadow:"0 4px 16px rgba(107,63,160,0.25)" },
  errorBubble:      { background:"#fff0f4", color:"#9b2335", borderRadius:"4px 20px 20px 20px", border:"1px solid rgba(232,99,122,0.2)" },
  messageTime:      { fontSize:"0.68rem", color:"#b89ec4", marginTop:4, padding:"0 4px" },
  typingDots:       { display:"flex", alignItems:"center", height:20 },
  inputArea:        { background:"white", borderTop:"1px solid #f0e8fb", padding:"16px 28px 20px" },
  inputWrapper:     { display:"flex", gap:12, alignItems:"flex-end", background:"#faf5ff", borderRadius:16, padding:"10px 10px 10px 20px", border:"2px solid #f0e8fb", transition:"border 0.2s" },
  textarea:         { flex:1, border:"none", background:"transparent", outline:"none", resize:"none", fontFamily:"Plus Jakarta Sans, sans-serif", fontSize:"0.95rem", color:"#3b0764", lineHeight:1.6, maxHeight:120, overflowY:"auto" },
  sendBtn:          { width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#9b72cf,#e8637a)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s", boxShadow:"0 4px 16px rgba(155,114,207,0.3)" },
  inputHint:        { fontSize:"0.72rem", color:"#b89ec4", marginTop:8, textAlign:"center" },
  kbd:              { background:"#f0e8fb", borderRadius:4, padding:"1px 6px", fontSize:"0.7rem", color:"#6b3fa0", fontFamily:"monospace" },
};
