import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/lifestyle";
const user = JSON.parse(localStorage.getItem("user") || "{}");
const USER_ID = user._id || "";

const ACTIVITY_LEVELS = [
  { value: "sedentary",   label: "Sedentary",    icon: "🪑", desc: "Little or no exercise" },
  { value: "light",       label: "Light",         icon: "🚶", desc: "1-3 days/week" },
  { value: "moderate",    label: "Moderate",      icon: "🏃", desc: "3-5 days/week" },
  { value: "active",      label: "Active",        icon: "💪", desc: "6-7 days/week" },
  { value: "very_active", label: "Very Active",   icon: "🔥", desc: "Twice daily" },
];

const GOALS = [
  { value: "lose_weight",    label: "Lose Weight",    icon: "⬇️" },
  { value: "maintain",       label: "Maintain",        icon: "⚖️" },
  { value: "gain_weight",    label: "Gain Weight",     icon: "⬆️" },
  { value: "build_muscle",   label: "Build Muscle",    icon: "💪" },
];

const EX_CATEGORIES = ["All", "Cardio", "Strength", "Yoga", "Flexibility"];

const CAT_COLORS = {
  Cardio:      { bg:"#fff0f4", color:"#e8637a", border:"#f4a7b9" },
  Strength:    { bg:"#f0e8fb", color:"#9b72cf", border:"#c084b0" },
  Yoga:        { bg:"#eaf8f0", color:"#4caf78", border:"#a8dbc9" },
  Flexibility: { bg:"#fef3eb", color:"#f4a261", border:"#f4c5a0" },
};

function getBMIInfo(bmi) {
  if (!bmi) return null;
  if (bmi < 18.5) return { category:"Underweight", color:"#4a9eca", bg:"#e8f4fd", emoji:"📉", tip:"You may need to increase caloric intake with nutrient-dense foods." };
  if (bmi < 25)   return { category:"Normal",      color:"#4caf78", bg:"#edfbf3", emoji:"✅", tip:"Great! Maintain your healthy weight with balanced diet and exercise." };
  if (bmi < 30)   return { category:"Overweight",  color:"#f4a261", bg:"#fef3eb", emoji:"⚠️", tip:"Consider increasing physical activity and reducing processed foods." };
  return           { category:"Obese",             color:"#e8637a", bg:"#fff0f4", emoji:"🩺", tip:"Consult a healthcare provider for a personalized weight management plan." };
}

function getDietSuggestions(bmi, goal) {
  const base = {
    lose_weight: [
      { icon:"🥗", title:"Caloric Deficit",    desc:"Eat 300-500 calories less than your daily needs. Focus on volume eating with vegetables." },
      { icon:"🥩", title:"High Protein",        desc:"Include protein in every meal — eggs, lentils, fish, chicken. Protein keeps you full longer." },
      { icon:"🚫", title:"Avoid Ultra-Processed", desc:"Cut out chips, biscuits, sugary drinks and fast food. These are calorie-dense with low nutrition." },
      { icon:"💧", title:"Hydration",           desc:"Drink 2-3 liters of water daily. Sometimes thirst is mistaken for hunger." },
      { icon:"🍽️", title:"Smaller Portions",    desc:"Use smaller plates. Eat slowly and stop when 80% full. It takes 20 minutes for fullness signals to reach brain." },
      { icon:"🥦", title:"Fill Half Your Plate", desc:"Make vegetables and fruits at least half of every meal for fiber and micronutrients." },
    ],
    maintain: [
      { icon:"⚖️", title:"Balanced Macros",     desc:"Aim for 40% carbs, 30% protein, 30% healthy fats at each meal for balanced energy." },
      { icon:"🌾", title:"Whole Grains",         desc:"Choose brown rice, oats and whole wheat bread over refined grains for sustained energy." },
      { icon:"🐟", title:"Omega-3 Rich Foods",   desc:"Include fatty fish, walnuts and flaxseeds 2-3 times weekly for heart and brain health." },
      { icon:"🥛", title:"Calcium Sources",      desc:"Include dairy or fortified plant milk, tofu and leafy greens for bone health." },
      { icon:"🍎", title:"Rainbow Diet",         desc:"Eat fruits and vegetables of different colors daily to get diverse phytonutrients." },
      { icon:"⏰", title:"Regular Meal Times",   desc:"Eat at consistent times daily to regulate metabolism and hunger hormones." },
    ],
    gain_weight: [
      { icon:"📈", title:"Caloric Surplus",      desc:"Eat 300-500 calories more than your daily needs. Focus on nutrient-dense foods, not junk." },
      { icon:"🥜", title:"Healthy Fats",         desc:"Add avocados, nuts, olive oil and seeds. These are calorie-dense and nutritious." },
      { icon:"🍌", title:"Calorie-Dense Snacks", desc:"Nut butters, dried fruits, cheese and smoothies make excellent high-calorie snacks." },
      { icon:"💪", title:"Protein for Muscle",   desc:"0.8-1g protein per pound of body weight when combining weight gain with muscle building." },
      { icon:"🥛", title:"Liquid Calories",      desc:"Smoothies with milk, banana, peanut butter and oats are easy calorie additions." },
      { icon:"🍚", title:"Complex Carbs",         desc:"Rice, potatoes, oats and whole grain bread provide the energy needed for weight gain." },
    ],
    build_muscle: [
      { icon:"🥩", title:"Protein Priority",     desc:"1.6-2.2g protein per kg body weight daily. Distribute across 4-5 meals for best absorption." },
      { icon:"⏱️", title:"Pre-Workout Fuel",      desc:"Eat carbs and protein 1-2 hours before training. Banana with peanut butter is perfect." },
      { icon:"🔄", title:"Post-Workout Recovery",desc:"Consume protein within 30 minutes of training. Whey protein, eggs or Greek yogurt." },
      { icon:"🌾", title:"Carbs for Performance", desc:"Don't fear carbs when building muscle. They fuel your workouts and support recovery." },
      { icon:"😴", title:"Sleep for Growth",      desc:"Muscle grows during sleep. Aim for 7-9 hours. Casein protein before bed feeds muscles overnight." },
      { icon:"💊", title:"Creatine",              desc:"The most researched supplement for muscle building. 3-5g daily improves strength and muscle gain." },
    ],
  };
  return base[goal] || base.maintain;
}

function getExerciseRecommendations(bmi, goal) {
  if (goal === "lose_weight" || (bmi && bmi >= 25)) {
    return { primary:"Cardio", secondary:"Strength", tip:"Mix cardio and strength training for optimal fat loss. Cardio burns calories; muscle boosts metabolism." };
  }
  if (goal === "build_muscle") {
    return { primary:"Strength", secondary:"Flexibility", tip:"Focus on progressive overload in strength training. Add flexibility work to prevent injury." };
  }
  if (goal === "gain_weight") {
    return { primary:"Strength", secondary:"Yoga", tip:"Strength training builds muscle mass. Yoga supports recovery and reduces stress that inhibits gains." };
  }
  return { primary:"Cardio", secondary:"Yoga", tip:"Balanced fitness: cardio for heart health, yoga for flexibility and stress reduction." };
}

export default function LifestylePage() {
  const [activeTab, setActiveTab]       = useState("bmi");
  const [height, setHeight]             = useState("");
  const [weight, setWeight]             = useState("");
  const [age, setAge]                   = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goal, setGoal]                 = useState("maintain");
  const [bmiResult, setBmiResult]       = useState(null);
  const [bmiHistory, setBmiHistory]     = useState([]);
  const [exercises, setExercises]       = useState([]);
  const [exCategory, setExCategory]     = useState("All");
  const [completedIds, setCompletedIds] = useState([]);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    fetchBMIHistory();
    fetchExercises();
    fetchCompletedExercises();
  }, []);

  useEffect(() => { fetchExercises(); }, [exCategory]);

  const fetchBMIHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/bmi/${USER_ID}`);
      if (data.success && data.records.length > 0) {
        setBmiHistory(data.records);
        setBmiResult(data.records[0]);
      }
    } catch {}
  };

  const fetchExercises = async () => {
    try {
      const params = exCategory !== "All" ? { category: exCategory } : {};
      const { data } = await axios.get(`${API}/exercises`, { params });
      if (data.success) setExercises(data.exercises);
    } catch {}
  };

  const fetchCompletedExercises = async () => {
    try {
      const { data } = await axios.get(`${API}/exercises/log/${USER_ID}`);
      if (data.success) setCompletedIds(data.completedIds);
    } catch {}
  };

  const handleCalculateBMI = async () => {
    if (!height || !weight) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/bmi`, {
        userId: USER_ID, height: parseFloat(height), weight: parseFloat(weight),
      });
      if (data.success) {
        setBmiResult(data.record);
        fetchBMIHistory();
      }
    } catch {}
    setLoading(false);
  };

  const handleCompleteExercise = async (exerciseId) => {
    try {
      await axios.post(`${API}/exercises/log`, { userId: USER_ID, exerciseId });
      setCompletedIds(prev => [...prev, exerciseId]);
    } catch {}
  };

  const bmiInfo = getBMIInfo(bmiResult?.bmi);
  const dietSuggestions = getDietSuggestions(bmiResult?.bmi, goal);
  const exRec = getExerciseRecommendations(bmiResult?.bmi, goal);
  const filteredEx = exCategory === "All" ? exercises : exercises.filter(e => e.category === exCategory);

  const TABS = [
    { key:"bmi",      icon:"⚖️",  label:"BMI Calculator" },
    { key:"diet",     icon:"🥗",  label:"Diet Plan" },
    { key:"exercise", icon:"💪",  label:"Exercises" },
    { key:"tips",     icon:"💡",  label:"Health Tips" },
  ];

  return (
    <div style={S.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
        .lifestyle-card { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .ex-card:hover { transform:translateY(-4px)!important; box-shadow:0 12px 40px rgba(107,63,160,0.15)!important; }
        .tab-btn:hover { background:rgba(155,114,207,0.1)!important; }
        .diet-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(107,63,160,0.12)!important; }
        .goal-btn:hover { transform:scale(1.03); }
        .activity-btn:hover { transform:translateY(-2px); }
        .calc-btn:hover { transform:translateY(-3px)!important; box-shadow:0 12px 32px rgba(155,114,207,0.5)!important; }
        input[type=range] { -webkit-appearance:none; width:100%; height:6px; border-radius:3px; background:linear-gradient(90deg,#9b72cf,#e8637a); outline:none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; background:white; border:3px solid #9b72cf; cursor:pointer; box-shadow:0 2px 8px rgba(155,114,207,0.4); }
      `}</style>

      {/* ── HERO HEADER ── */}
      <div style={S.hero}>
        <div style={S.heroOverlay}/>
        <div style={S.heroContent}>
          <p style={S.heroSub}>YOUR WELLNESS JOURNEY</p>
          <h1 style={S.heroTitle}>Lifestyle & BMI Tracker</h1>
          <div style={S.heroDivider}/>
          <p style={S.heroDesc}>Track your health, discover personalized diet plans and find the perfect exercise routine</p>
          {bmiResult && bmiInfo && (
            <div style={{ ...S.heroBadge, background: bmiInfo.color }}>
              {bmiInfo.emoji} Current BMI: {bmiResult.bmi} — {bmiInfo.category}
            </div>
          )}
        </div>
      </div>

      <div style={S.page}>

        {/* ── TABS ── */}
        <div style={S.tabsWrapper}>
          <div style={S.tabs}>
            {TABS.map(t => (
              <button key={t.key} className="tab-btn"
                style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }}
                onClick={() => setActiveTab(t.key)}>
                <span style={{ fontSize:"1.3rem" }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            BMI CALCULATOR TAB
        ══════════════════════════════════════ */}
        {activeTab === "bmi" && (
          <div style={S.tabContent}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

              {/* Input Card */}
              <div className="lifestyle-card" style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardIcon}>📏</div>
                  <div>
                    <h2 style={S.cardTitle}>Calculate Your BMI</h2>
                    <p style={S.cardSub}>Body Mass Index measures body fat based on height and weight</p>
                  </div>
                </div>

                <div style={S.inputGroup}>
                  <label style={S.label}>HEIGHT</label>
                  <div style={S.inputWrapper}>
                    <input style={S.input} type="number" placeholder="165" value={height}
                      onChange={e => setHeight(e.target.value)}/>
                    <span style={S.inputUnit}>cm</span>
                  </div>
                  {height && <input type="range" min="100" max="220" value={height} onChange={e => setHeight(e.target.value)} style={{ marginTop:8 }}/>}
                </div>

                <div style={S.inputGroup}>
                  <label style={S.label}>WEIGHT</label>
                  <div style={S.inputWrapper}>
                    <input style={S.input} type="number" placeholder="60" value={weight}
                      onChange={e => setWeight(e.target.value)}/>
                    <span style={S.inputUnit}>kg</span>
                  </div>
                  {weight && <input type="range" min="30" max="150" value={weight} onChange={e => setWeight(e.target.value)} style={{ marginTop:8 }}/>}
                </div>

                <div style={S.inputGroup}>
                  <label style={S.label}>AGE (optional)</label>
                  <div style={S.inputWrapper}>
                    <input style={S.input} type="number" placeholder="25" value={age}
                      onChange={e => setAge(e.target.value)}/>
                    <span style={S.inputUnit}>yrs</span>
                  </div>
                </div>

                <div style={S.inputGroup}>
                  <label style={S.label}>YOUR GOAL</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
                    {GOALS.map(g => (
                      <button key={g.value} className="goal-btn"
                        style={{ ...S.goalBtn, ...(goal === g.value ? S.goalBtnActive : {}) }}
                        onClick={() => setGoal(g.value)}>
                        <span style={{ fontSize:"1.4rem" }}>{g.icon}</span>
                        <span style={{ fontSize:"0.82rem", fontWeight:600 }}>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button className="calc-btn" style={S.calcBtn} onClick={handleCalculateBMI} disabled={loading || !height || !weight}>
                  {loading ? "Calculating..." : "⚖️ Calculate BMI"}
                </button>
              </div>

              {/* Result + Scale Card */}
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

                {/* BMI Result */}
                {bmiResult && bmiInfo ? (
                  <div className="lifestyle-card" style={{ ...S.card, background: bmiInfo.bg, border:`2px solid ${bmiInfo.color}44`, textAlign:"center", padding:32 }}>
                    <div style={{ fontSize:"4rem", marginBottom:8 }}>{bmiInfo.emoji}</div>
                    <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"5rem", fontWeight:700, color:bmiInfo.color, lineHeight:1 }}>
                      {bmiResult.bmi}
                    </div>
                    <div style={{ fontSize:"1.1rem", fontWeight:700, color:bmiInfo.color, marginTop:8, letterSpacing:1 }}>
                      {bmiInfo.category}
                    </div>
                    <div style={{ fontSize:"0.85rem", color:"#7a5490", marginTop:12, lineHeight:1.7, maxWidth:280, margin:"12px auto 0" }}>
                      {bmiInfo.tip}
                    </div>
                    <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:20 }}>
                      <div style={S.statBox}>
                        <div style={{ fontSize:"1.4rem", fontWeight:700, color:"#6b3fa0" }}>{bmiResult.height} cm</div>
                        <div style={{ fontSize:"0.72rem", color:"#b89ec4", textTransform:"uppercase", letterSpacing:1 }}>Height</div>
                      </div>
                      <div style={S.statBox}>
                        <div style={{ fontSize:"1.4rem", fontWeight:700, color:"#6b3fa0" }}>{bmiResult.weight} kg</div>
                        <div style={{ fontSize:"0.72rem", color:"#b89ec4", textTransform:"uppercase", letterSpacing:1 }}>Weight</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lifestyle-card" style={{ ...S.card, textAlign:"center", padding:48 }}>
                    <div style={{ fontSize:"4rem", marginBottom:16 }}>⚖️</div>
                    <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.4rem", color:"#6b3fa0" }}>Enter your measurements</div>
                    <div style={{ fontSize:"0.9rem", color:"#b89ec4", marginTop:8 }}>Your BMI result will appear here</div>
                  </div>
                )}

                {/* BMI Scale */}
                <div className="lifestyle-card" style={S.card}>
                  <h3 style={{ ...S.cardTitle, fontSize:"1rem", marginBottom:16 }}>📊 BMI Scale</h3>
                  {[
                    { label:"Underweight", range:"< 18.5", color:"#4a9eca", width:"20%" },
                    { label:"Normal",      range:"18.5 – 24.9", color:"#4caf78", width:"30%" },
                    { label:"Overweight",  range:"25 – 29.9", color:"#f4a261", width:"25%" },
                    { label:"Obese",       range:"≥ 30", color:"#e8637a", width:"25%" },
                  ].map(s => (
                    <div key={s.label} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <div style={{ width:14, height:14, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
                      <div style={{ flex:1, height:8, background:s.color+"33", borderRadius:4, overflow:"hidden" }}>
                        <div style={{ width: bmiResult && getBMIInfo(bmiResult.bmi)?.category === s.label ? "100%" : "60%", height:"100%", background:s.color, borderRadius:4 }}/>
                      </div>
                      <div style={{ fontSize:"0.8rem", color:"#7a5490", minWidth:80 }}>{s.label}</div>
                      <div style={{ fontSize:"0.75rem", color:"#b89ec4", minWidth:80 }}>{s.range}</div>
                    </div>
                  ))}
                </div>

                {/* History */}
                {bmiHistory.length > 1 && (
                  <div className="lifestyle-card" style={S.card}>
                    <h3 style={{ ...S.cardTitle, fontSize:"1rem", marginBottom:16 }}>📈 BMI History</h3>
                    {bmiHistory.slice(0,5).map((r,i) => {
                      const info = getBMIInfo(r.bmi);
                      return (
                        <div key={r._id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom: i < 4 ? "1px solid #f3e8ff" : "none" }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:info?.color, flexShrink:0 }}/>
                          <div style={{ flex:1, fontSize:"0.88rem", color:"#6b3fa0", fontWeight:600 }}>{r.bmi}</div>
                          <div style={{ fontSize:"0.78rem", color:info?.color, fontWeight:600 }}>{r.category}</div>
                          <div style={{ fontSize:"0.72rem", color:"#b89ec4" }}>{r.height}cm / {r.weight}kg</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Activity Level */}
            <div className="lifestyle-card" style={{ ...S.card, marginTop:24 }}>
              <h3 style={S.cardTitle}>🏃 Activity Level</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
                {ACTIVITY_LEVELS.map(a => (
                  <button key={a.value} className="activity-btn"
                    style={{ ...S.activityBtn, ...(activityLevel === a.value ? S.activityBtnActive : {}) }}
                    onClick={() => setActivityLevel(a.value)}>
                    <span style={{ fontSize:"1.8rem" }}>{a.icon}</span>
                    <span style={{ fontSize:"0.85rem", fontWeight:600 }}>{a.label}</span>
                    <span style={{ fontSize:"0.72rem", opacity:0.7 }}>{a.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            DIET PLAN TAB
        ══════════════════════════════════════ */}
        {activeTab === "diet" && (
          <div style={S.tabContent}>

            {/* Goal selector */}
            <div className="lifestyle-card" style={{ ...S.card, marginBottom:24 }}>
              <h3 style={S.cardTitle}>🎯 Your Goal</h3>
              <div style={{ display:"flex", gap:14 }}>
                {GOALS.map(g => (
                  <button key={g.value} className="goal-btn"
                    style={{ ...S.goalBtnLarge, ...(goal === g.value ? S.goalBtnLargeActive : {}) }}
                    onClick={() => setGoal(g.value)}>
                    <span style={{ fontSize:"2rem" }}>{g.icon}</span>
                    <span style={{ fontSize:"0.9rem", fontWeight:600 }}>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {bmiResult && bmiInfo && (
              <div className="lifestyle-card" style={{ ...S.card, marginBottom:24, background:bmiInfo.bg, border:`1.5px solid ${bmiInfo.color}44`, display:"flex", alignItems:"center", gap:20 }}>
                <div style={{ fontSize:"3rem" }}>{bmiInfo.emoji}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:"1.1rem", color:bmiInfo.color }}>Your BMI: {bmiResult.bmi} — {bmiInfo.category}</div>
                  <div style={{ fontSize:"0.9rem", color:"#7a5490", marginTop:4, lineHeight:1.6 }}>{bmiInfo.tip}</div>
                </div>
              </div>
            )}

            <h2 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.8rem", color:"#6b3fa0", marginBottom:20 }}>
              🥗 Personalized Diet Plan for {GOALS.find(g=>g.value===goal)?.label}
            </h2>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
              {dietSuggestions.map((d,i) => (
                <div key={i} className="lifestyle-card diet-card"
                  style={{ ...S.card, animationDelay:`${i*0.07}s`, cursor:"default" }}>
                  <div style={{ fontSize:"2.2rem", marginBottom:12 }}>{d.icon}</div>
                  <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.15rem", fontWeight:600, color:"#3b0764", marginBottom:10 }}>{d.title}</div>
                  <div style={{ fontSize:"0.88rem", color:"#7a5490", lineHeight:1.8 }}>{d.desc}</div>
                </div>
              ))}
            </div>

            {/* Meal timing */}
            <div className="lifestyle-card" style={{ ...S.card, marginTop:24 }}>
              <h3 style={S.cardTitle}>⏰ Optimal Meal Timing</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
                {[
                  { time:"7:00 AM", meal:"Breakfast", icon:"🌅", desc:"Largest meal. Include protein, complex carbs and fruit." },
                  { time:"10:30 AM", meal:"Mid-Morning", icon:"🍎", desc:"Light snack. Fruit, nuts or yogurt to maintain energy." },
                  { time:"1:00 PM", meal:"Lunch", icon:"☀️", desc:"Balanced meal. Protein, vegetables and whole grains." },
                  { time:"4:00 PM", meal:"Afternoon", icon:"🫖", desc:"Small snack. Prevents overeating at dinner." },
                  { time:"7:00 PM", meal:"Dinner", icon:"🌙", desc:"Lighter meal. Emphasize protein and vegetables over carbs." },
                  { time:"9:00 PM", meal:"If Hungry", icon:"🥛", desc:"Warm milk, small handful of nuts or light yogurt only." },
                ].map((m,i) => (
                  <div key={i} style={{ background:"#faf5ff", borderRadius:14, padding:16, border:"1px solid #f0e8fb" }}>
                    <div style={{ fontSize:"1.5rem", marginBottom:6 }}>{m.icon}</div>
                    <div style={{ fontSize:"0.78rem", color:"#c084b0", fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>{m.time}</div>
                    <div style={{ fontSize:"0.95rem", fontWeight:700, color:"#6b3fa0", margin:"4px 0" }}>{m.meal}</div>
                    <div style={{ fontSize:"0.78rem", color:"#9d6b9d", lineHeight:1.6 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Water intake */}
            <div className="lifestyle-card" style={{ ...S.card, marginTop:24, background:"linear-gradient(135deg,#e8f4fd,#d4eaf8)", border:"1.5px solid #4a9eca44" }}>
              <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                <div style={{ fontSize:"3rem" }}>💧</div>
                <div>
                  <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.4rem", fontWeight:600, color:"#2c6fa8" }}>Daily Water Intake Goal</div>
                  <div style={{ fontSize:"3rem", fontWeight:700, color:"#4a9eca", lineHeight:1 }}>
                    {weight ? (Math.round(parseFloat(weight) * 0.033 * 10) / 10) : "2.5"}L
                  </div>
                  <div style={{ fontSize:"0.9rem", color:"#5b8db3", marginTop:4 }}>
                    Based on your weight ({weight || "?"}kg). Drink a glass of water every 2 hours.
                  </div>
                </div>
                <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap", maxWidth:200 }}>
                  {Array.from({ length: 8 }).map((_,i) => (
                    <div key={i} style={{ width:32, height:48, borderRadius:8, background:"rgba(74,158,202,0.2)", border:"2px solid #4a9eca44", display:"flex", alignItems:"flex-end", overflow:"hidden" }}>
                      <div style={{ width:"100%", height:"60%", background:"linear-gradient(180deg,#7bc8f0,#4a9eca)", borderRadius:"0 0 6px 6px" }}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            EXERCISE TAB
        ══════════════════════════════════════ */}
        {activeTab === "exercise" && (
          <div style={S.tabContent}>

            {/* Recommendation banner */}
            <div className="lifestyle-card" style={{ ...S.card, marginBottom:24, background:"linear-gradient(135deg,#6b3fa0,#c084b0,#e8637a)", color:"white", padding:"28px 32px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                <div style={{ fontSize:"3rem" }}>💪</div>
                <div>
                  <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.5rem", fontWeight:600, marginBottom:6 }}>
                    Recommended for You: {exRec.primary} + {exRec.secondary}
                  </div>
                  <div style={{ fontSize:"0.9rem", opacity:0.9, lineHeight:1.7 }}>{exRec.tip}</div>
                </div>
                <div style={{ marginLeft:"auto", textAlign:"center" }}>
                  <div style={{ fontSize:"2rem", fontWeight:700 }}>{completedIds.length}</div>
                  <div style={{ fontSize:"0.75rem", opacity:0.85, textTransform:"uppercase", letterSpacing:1 }}>Done Today</div>
                </div>
              </div>
            </div>

            {/* Category filter */}
            <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
              {EX_CATEGORIES.map(c => {
                const col = CAT_COLORS[c] || { bg:"#f0e8fb", color:"#6b3fa0", border:"#c084b0" };
                return (
                  <button key={c}
                    style={{ padding:"10px 24px", borderRadius:30, border:`2px solid ${exCategory===c ? col.color : col.border}`, background: exCategory===c ? col.color : col.bg, color: exCategory===c ? "white" : col.color, fontWeight:600, fontSize:"0.9rem", cursor:"pointer", transition:"all 0.2s", fontFamily:"Plus Jakarta Sans, sans-serif" }}
                    onClick={() => setExCategory(c)}>
                    {c === "All" ? "🏋️ All" : c === "Cardio" ? "🏃 Cardio" : c === "Strength" ? "💪 Strength" : c === "Yoga" ? "🧘 Yoga" : "🤸 Flexibility"}
                  </button>
                );
              })}
            </div>

            {/* Exercise grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
              {filteredEx.map((ex, i) => {
                const done = completedIds.includes(ex._id);
                const col  = CAT_COLORS[ex.category] || CAT_COLORS.Cardio;
                return (
                  <div key={ex._id} className="lifestyle-card ex-card"
                    style={{ ...S.card, animationDelay:`${i*0.05}s`, border:`1.5px solid ${done ? "#4caf7844" : col.border+"44"}`, background: done ? "#edfbf3" : "white", transition:"all 0.2s", cursor:"default" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <span style={{ padding:"5px 14px", borderRadius:20, background:col.bg, color:col.color, fontSize:"0.78rem", fontWeight:600, border:`1px solid ${col.border}44` }}>
                        {ex.category}
                      </span>
                      <span style={{ padding:"5px 14px", borderRadius:20, background: ex.difficulty==="Easy" ? "#edfbf3" : ex.difficulty==="Medium" ? "#fef3eb" : "#fff0f4", color: ex.difficulty==="Easy" ? "#4caf78" : ex.difficulty==="Medium" ? "#f4a261" : "#e8637a", fontSize:"0.78rem", fontWeight:600 }}>
                        {ex.difficulty}
                      </span>
                    </div>
                    <h3 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:"1.3rem", fontWeight:600, color: done ? "#4caf78" : "#3b0764", marginBottom:8 }}>
                      {done && "✅ "}{ex.name}
                    </h3>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
                      <span style={{ fontSize:"0.85rem", color:"#9b72cf", fontWeight:600 }}>⏱ {ex.duration}</span>
                    </div>
                    <p style={{ fontSize:"0.85rem", color:"#7a5490", lineHeight:1.7, marginBottom:16 }}>{ex.instructions}</p>
                    <button
                      onClick={() => !done && handleCompleteExercise(ex._id)}
                      style={{ width:"100%", padding:"12px", border:"none", borderRadius:12, background: done ? "linear-gradient(135deg,#4caf78,#2d9b5c)" : `linear-gradient(135deg,${col.color},${col.color}cc)`, color:"white", fontWeight:600, fontSize:"0.9rem", cursor: done ? "default" : "pointer", fontFamily:"Plus Jakarta Sans, sans-serif", transition:"all 0.2s" }}>
                      {done ? "✅ Completed Today!" : "Mark as Done"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Weekly plan */}
            <div className="lifestyle-card" style={{ ...S.card, marginTop:24 }}>
              <h3 style={S.cardTitle}>📅 Recommended Weekly Plan</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:10 }}>
                {[
                  { day:"Mon", type:"Cardio",      icon:"🏃", color:"#e8637a" },
                  { day:"Tue", type:"Strength",    icon:"💪", color:"#9b72cf" },
                  { day:"Wed", type:"Yoga",         icon:"🧘", color:"#4caf78" },
                  { day:"Thu", type:"Cardio",      icon:"🏃", color:"#e8637a" },
                  { day:"Fri", type:"Strength",    icon:"💪", color:"#9b72cf" },
                  { day:"Sat", type:"Flexibility", icon:"🤸", color:"#f4a261" },
                  { day:"Sun", type:"Rest",         icon:"😴", color:"#b89ec4" },
                ].map((d,i) => (
                  <div key={i} style={{ textAlign:"center", background:"#faf5ff", borderRadius:14, padding:"16px 8px", border:"1px solid #f0e8fb" }}>
                    <div style={{ fontSize:"0.7rem", fontWeight:700, color:"#b89ec4", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>{d.day}</div>
                    <div style={{ fontSize:"1.8rem", marginBottom:6 }}>{d.icon}</div>
                    <div style={{ fontSize:"0.75rem", fontWeight:600, color:d.color }}>{d.type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            HEALTH TIPS TAB
        ══════════════════════════════════════ */}
        {activeTab === "tips" && (
          <div style={S.tabContent}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

              {/* Daily reminders */}
              <div className="lifestyle-card" style={S.card}>
                <h3 style={S.cardTitle}>🌅 Daily Health Reminders</h3>
                {[
                  { time:"7:00 AM",  icon:"☀️",  tip:"Start with a glass of warm water with lemon to kickstart metabolism.", color:"#f4a261" },
                  { time:"8:00 AM",  icon:"🥣",  tip:"Never skip breakfast — it fuels your brain and prevents overeating later.", color:"#4caf78" },
                  { time:"10:00 AM", icon:"🧘",  tip:"Take a 5-minute stretch break if you've been sitting. Improves circulation.", color:"#9b72cf" },
                  { time:"12:00 PM", icon:"🥗",  tip:"Eat a balanced lunch with vegetables, protein and complex carbs.", color:"#e8637a" },
                  { time:"3:00 PM",  icon:"💧",  tip:"Drink a large glass of water — afternoon dehydration causes fatigue and brain fog.", color:"#4a9eca" },
                  { time:"5:00 PM",  icon:"🏃",  tip:"Best time for exercise — body temperature and performance peak in late afternoon.", color:"#f4845f" },
                  { time:"8:00 PM",  icon:"📵",  tip:"Reduce screen time. Blue light suppresses melatonin and delays sleep.", color:"#7b6fa0" },
                  { time:"10:00 PM", icon:"😴",  tip:"Aim to be asleep by 10pm for optimal hormone regulation and recovery.", color:"#c084b0" },
                ].map((r,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"12px 0", borderBottom: i < 7 ? "1px solid #f3e8ff" : "none" }}>
                    <div style={{ width:52, height:52, borderRadius:12, background:r.color+"22", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1.5px solid ${r.color}44` }}>
                      <div style={{ fontSize:"1.2rem" }}>{r.icon}</div>
                      <div style={{ fontSize:"0.58rem", color:r.color, fontWeight:700, marginTop:2 }}>{r.time}</div>
                    </div>
                    <div style={{ fontSize:"0.88rem", color:"#7a5490", lineHeight:1.7, paddingTop:4 }}>{r.tip}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {/* Personalized tips */}
                {bmiResult && (
                  <div className="lifestyle-card" style={{ ...S.card, background: getBMIInfo(bmiResult.bmi)?.bg, border:`1.5px solid ${getBMIInfo(bmiResult.bmi)?.color}44` }}>
                    <h3 style={{ ...S.cardTitle, color: getBMIInfo(bmiResult.bmi)?.color }}>
                      {getBMIInfo(bmiResult.bmi)?.emoji} Personalized Tips for You
                    </h3>
                    {(bmiResult.bmi < 18.5 ? [
                      "Eat every 3-4 hours — don't let yourself go hungry",
                      "Add healthy calorie-dense foods: avocado, nuts, olive oil",
                      "Strength training builds muscle mass, not just fat",
                      "Rule out underlying conditions with a doctor if underweight is persistent",
                      "Liquid calories via smoothies are easy to add without feeling stuffed",
                    ] : bmiResult.bmi < 25 ? [
                      "Maintain your healthy habits — you're doing great!",
                      "Focus on performance goals rather than weight goals",
                      "Regular check-ups even when healthy — prevention is key",
                      "Muscle weighs more than fat — track fitness, not just weight",
                      "Share your healthy habits with those around you",
                    ] : bmiResult.bmi < 30 ? [
                      "Even 5-10% weight loss significantly reduces health risks",
                      "Start with 15 minutes of walking daily and build up gradually",
                      "Swap one processed food daily for a whole food alternative",
                      "Sleep 7-9 hours — sleep deprivation worsens weight management",
                      "Find an exercise you enjoy — sustainability matters more than intensity",
                    ] : [
                      "Work with a doctor for a safe, personalized weight loss plan",
                      "Even small changes have significant health benefits — start today",
                      "Focus on non-scale victories: energy, sleep quality, mood",
                      "Seek support — weight management is harder alone",
                      "Address emotional eating with a counselor if food is comfort",
                    ]).map((tip, i) => (
                      <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                        <span style={{ color: getBMIInfo(bmiResult.bmi)?.color, fontSize:"1rem", marginTop:2 }}>→</span>
                        <span style={{ fontSize:"0.88rem", color:"#7a5490", lineHeight:1.6 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sleep tips */}
                <div className="lifestyle-card" style={{ ...S.card, background:"linear-gradient(135deg,#1e0a2e,#3b0764)", color:"white" }}>
                  <h3 style={{ ...S.cardTitle, color:"white" }}>🌙 Sleep & Recovery</h3>
                  {[
                    "7-9 hours sleep is non-negotiable for hormone regulation",
                    "Consistent sleep schedule — same time every day including weekends",
                    "Cool, dark room (18-20°C) for optimal sleep quality",
                    "No caffeine after 2pm — it has a 5-6 hour half-life",
                    "10-minute wind-down routine signals brain to prepare for sleep",
                  ].map((tip,i) => (
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                      <span style={{ color:"#c084b0", fontSize:"1rem" }}>✦</span>
                      <span style={{ fontSize:"0.88rem", opacity:0.9, lineHeight:1.6 }}>{tip}</span>
                    </div>
                  ))}
                </div>

                {/* Mental wellness */}
                <div className="lifestyle-card" style={{ ...S.card, background:"linear-gradient(135deg,#edfbf3,#d4f5e5)", border:"1.5px solid #4caf7844" }}>
                  <h3 style={{ ...S.cardTitle, color:"#2d7a50" }}>🧠 Mental Wellness</h3>
                  {[
                    "5 minutes of gratitude journaling daily reduces cortisol by 23%",
                    "Deep breathing: 4 counts in, hold 4, out 8 — calms nervous system",
                    "Spend 20 minutes in sunlight daily for Vitamin D and mood",
                    "Strong social connections add up to 7 years to life expectancy",
                    "Mindfulness reduces anxiety and improves emotional regulation",
                  ].map((tip,i) => (
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                      <span style={{ color:"#4caf78", fontSize:"1rem" }}>✓</span>
                      <span style={{ fontSize:"0.88rem", color:"#2d7a50", lineHeight:1.6 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  STYLES
// ══════════════════════════════════════
const S = {
  wrapper:    { minHeight:"100vh", background:"#faf5ff", fontFamily:"Plus Jakarta Sans, sans-serif" },

  hero:       { position:"relative", height:280, overflow:"hidden", background:"linear-gradient(135deg,#1e0a2e 0%,#6b3fa0 50%,#e8637a 100%)" },
  heroOverlay:{ position:"absolute", inset:0, background:"url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400') center/cover", opacity:0.15 },
  heroContent:{ position:"relative", zIndex:1, maxWidth:"100%", padding:"48px 48px 0", color:"white" },
  heroSub:    { fontSize:"0.72rem", letterSpacing:5, opacity:0.75, fontWeight:600, marginBottom:10 },
  heroTitle:  { fontFamily:"Cormorant Garamond, serif", fontSize:"3.2rem", fontWeight:700, lineHeight:1.1, marginBottom:12 },
  heroDivider:{ width:60, height:3, background:"rgba(255,255,255,0.5)", borderRadius:2, marginBottom:12 },
  heroDesc:   { fontSize:"1rem", opacity:0.85, lineHeight:1.6, maxWidth:600 },
  heroBadge:  { display:"inline-flex", alignItems:"center", gap:8, marginTop:16, padding:"8px 20px", borderRadius:30, color:"white", fontSize:"0.9rem", fontWeight:600, backdropFilter:"blur(10px)" },

  page:       { padding:"0 40px 60px", maxWidth:"100%" },

  tabsWrapper:{ background:"white", borderBottom:"1px solid #f0e8fb", position:"sticky", top:60, zIndex:50, boxShadow:"0 4px 20px rgba(107,63,160,0.08)" },
  tabs:       { display:"flex", gap:4, padding:"0 40px", maxWidth:"100%" },
  tab:        { display:"flex", alignItems:"center", gap:10, padding:"18px 28px", border:"none", background:"transparent", cursor:"pointer", fontSize:"0.95rem", fontWeight:500, color:"#b89ec4", fontFamily:"Plus Jakarta Sans, sans-serif", borderBottom:"3px solid transparent", transition:"all 0.2s" },
  tabActive:  { color:"#6b3fa0", borderBottom:"3px solid #9b72cf", background:"rgba(155,114,207,0.06)", fontWeight:700 },

  tabContent: { paddingTop:28 },

  card:       { background:"white", borderRadius:20, padding:28, boxShadow:"0 2px 16px rgba(107,63,160,0.08)", border:"1px solid rgba(155,114,207,0.08)" },
  cardHeader: { display:"flex", alignItems:"flex-start", gap:16, marginBottom:28 },
  cardIcon:   { width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#f0e8fb,#fde8ec)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem", flexShrink:0 },
  cardTitle:  { fontFamily:"Cormorant Garamond, serif", fontSize:"1.3rem", fontWeight:600, color:"#3b0764", marginBottom:4 },
  cardSub:    { fontSize:"0.85rem", color:"#b89ec4", lineHeight:1.5 },

  inputGroup: { marginBottom:20 },
  label:      { display:"block", fontSize:"0.72rem", fontWeight:700, color:"#b89ec4", letterSpacing:2, textTransform:"uppercase", marginBottom:10 },
  inputWrapper:{ position:"relative" },
  input:      { width:"100%", padding:"14px 60px 14px 18px", border:"2px solid #f0e8fb", borderRadius:14, fontSize:"1rem", outline:"none", fontFamily:"Plus Jakarta Sans, sans-serif", color:"#3b0764", background:"#faf5ff", boxSizing:"border-box", transition:"border 0.2s" },
  inputUnit:  { position:"absolute", right:18, top:"50%", transform:"translateY(-50%)", fontSize:"0.85rem", fontWeight:600, color:"#c084b0" },

  goalBtn:    { display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 10px", border:"2px solid #f0e8fb", borderRadius:14, background:"#faf5ff", cursor:"pointer", transition:"all 0.2s", fontFamily:"Plus Jakarta Sans, sans-serif", color:"#7a5490" },
  goalBtnActive:{ border:"2px solid #9b72cf", background:"linear-gradient(135deg,#f0e8fb,#fde8ec)", color:"#6b3fa0" },

  goalBtnLarge:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"20px 16px", border:"2px solid #f0e8fb", borderRadius:16, background:"#faf5ff", cursor:"pointer", transition:"all 0.2s", fontFamily:"Plus Jakarta Sans, sans-serif", color:"#7a5490" },
  goalBtnLargeActive:{ border:"2px solid #9b72cf", background:"linear-gradient(135deg,#f0e8fb,#fde8ec)", color:"#6b3fa0" },

  calcBtn:    { width:"100%", padding:"16px", background:"linear-gradient(135deg,#9b72cf,#e8637a)", color:"white", border:"none", borderRadius:14, fontSize:"1rem", fontWeight:700, cursor:"pointer", fontFamily:"Plus Jakarta Sans, sans-serif", marginTop:8, transition:"all 0.25s", boxShadow:"0 6px 24px rgba(155,114,207,0.3)" },

  activityBtn:{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"18px 12px", border:"2px solid #f0e8fb", borderRadius:16, background:"#faf5ff", cursor:"pointer", transition:"all 0.2s", fontFamily:"Plus Jakarta Sans, sans-serif", color:"#7a5490" },
  activityBtnActive:{ border:"2px solid #9b72cf", background:"linear-gradient(135deg,#f0e8fb,#fde8ec)", color:"#6b3fa0" },

  statBox:    { background:"rgba(255,255,255,0.6)", borderRadius:12, padding:"12px 20px", textAlign:"center", backdropFilter:"blur(8px)" },
};
