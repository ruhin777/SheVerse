import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/marketplace";
const TYPES = ["All", "Safety", "Electronics", "Comfort", "Gear"];

export default function MarketplacePage() {
  const [products, setProducts]   = useState([]);
  const [cart, setCart]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [typeFilter, setType]     = useState("All");
  const [activeTab, setActiveTab] = useState("shop");
  const [orders, setOrders]       = useState([]);
  const [showCart, setShowCart]   = useState(false);
  const [success, setSuccess]     = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = typeFilter !== "All" ? { type: typeFilter } : {};
      const { data } = await axios.get(`${API}/products`, { params });
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${API}/orders/${user._id}`);
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(c => c.productId === product._id);
    if (existing) {
      setCart(cart.map(c =>
        c.productId === product._id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(c => c.productId !== productId));
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(cart.map(c => c.productId === productId ? { ...c, quantity: qty } : c));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleOrder = async () => {
    if (cart.length === 0) { alert("Your cart is empty!"); return; }
    try {
      const { data } = await axios.post(`${API}/order`, {
        userId: user._id,
        items: cart
      });
      setCart([]);
      setShowCart(false);
      setSuccess(`Order placed successfully! Total: ৳${data.totalPrice.toLocaleString()}`);
      fetchOrders();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      alert(err.response?.data?.error || "Order failed!");
    }
  };

  useEffect(() => { fetchProducts(); }, [typeFilter]);
  useEffect(() => { if (activeTab === "orders") fetchOrders(); }, [activeTab]);

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <p style={S.headerSub}>TRAVEL SAFETY ESSENTIALS</p>
          <h1 style={S.headerTitle}>Marketplace</h1>
          <div style={S.divider} />
          <p style={S.headerDesc}>
            Essential safety products for every female traveler.
          </p>
        </div>

        {/* Success */}
        {success && <div style={S.successBar}>{success}</div>}

        {/* Tabs + Cart Button */}
        <div style={S.topRow}>
          <div style={S.tabs}>
            {[
              { key: "shop",   label: "Shop" },
              { key: "orders", label: "My Orders" },
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

          {/* Cart Button */}
          <button style={S.cartBtn} onClick={() => setShowCart(true)}>
            Cart {cartCount > 0 && <span style={S.cartBadge}>{cartCount}</span>}
          </button>
        </div>

        {/* ── SHOP ── */}
        {activeTab === "shop" && (
          <div>
            {/* Type Filter */}
            <div style={S.filters}>
              {TYPES.map(t => (
                <button
                  key={t}
                  style={{ ...S.filterBtn, ...(typeFilter === t ? S.filterActive : {}) }}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {loading ? <p style={S.loading}>Loading...</p> : (
              <div style={S.grid}>
                {products.map(product => (
                  <div key={product._id} style={S.card}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(157,107,157,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(157,107,157,0.1)"; }}
                  >
                    {/* Image */}
                    <div style={S.imageBox}>
                      {product.image && !product.image.includes("marketplace")
                        ? <img src={product.image} alt={product.name} style={S.image} />
                        : <div style={S.imagePlaceholder}>
                            {product.type === "Safety" ? "🛡️" :
                             product.type === "Electronics" ? "🔋" :
                             product.type === "Comfort" ? "🎒" : "📦"}
                          </div>
                      }
                      <span style={S.typeBadge}>{product.type}</span>
                    </div>

                    {/* Body */}
                    <div style={S.cardBody}>
                      <h3 style={S.productName}>{product.name}</h3>
                      <p style={S.productDesc}>{product.description?.slice(0, 70)}...</p>

                      <div style={S.cardFooter}>
                        <div>
                          <p style={S.priceLabel}>PRICE</p>
                          <p style={S.price}>৳ {product.price?.toLocaleString()}</p>
                        </div>
                        <p style={S.stock}>
                          {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
                        </p>
                      </div>

                      <button
                        style={{ ...S.addBtn, ...(product.quantity === 0 ? S.disabledBtn : {}) }}
                        onClick={() => product.quantity > 0 && addToCart(product)}
                        disabled={product.quantity === 0}
                      >
                        {cart.find(c => c.productId === product._id) ? "Added to Cart" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY ORDERS ── */}
        {activeTab === "orders" && (
          <div style={S.ordersList}>
            <p style={S.sectionSub}>Your purchase history</p>
            {orders.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.empty}>No orders yet.</p>
                <button style={S.addBtn} onClick={() => setActiveTab("shop")}>
                  Start Shopping
                </button>
              </div>
            ) : (
              orders.map(order => (
                <div key={order._id} style={S.orderCard}>
                  <div style={S.orderHeader}>
                    <div>
                      <p style={S.orderDate}>
                        {new Date(order.orderDate).toLocaleDateString()}
                      </p>
                      <p style={S.orderTotal}>৳ {order.totalPrice?.toLocaleString()}</p>
                    </div>
                    <span style={{
                      ...S.statusBadge,
                      background: order.paymentStatus === "paid" ? "#d1fae5" : "#fef3c7",
                      color: order.paymentStatus === "paid" ? "#065f46" : "#92400e",
                    }}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  <div style={S.orderItems}>
                    {order.items?.map(item => (
                      <div key={item._id} style={S.orderItem}>
                        <span style={S.orderItemName}>{item.productId?.name}</span>
                        <span style={S.orderItemQty}>x{item.quantity}</span>
                        <span style={S.orderItemPrice}>৳ {(item.price * item.quantity)?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── CART SIDEBAR ── */}
      {showCart && (
        <div style={S.cartOverlay} onClick={() => setShowCart(false)}>
          <div style={S.cartSidebar} onClick={e => e.stopPropagation()}>

            <div style={S.cartHeader}>
              <h3 style={S.cartTitle}>Your Cart</h3>
              <button style={S.closeBtn} onClick={() => setShowCart(false)}>✕</button>
            </div>

            <div style={S.cartDivider} />

            {cart.length === 0 ? (
              <div style={S.emptyCart}>
                <p style={S.empty}>Your cart is empty.</p>
              </div>
            ) : (
              <>
                <div style={S.cartItems}>
                  {cart.map(item => (
                    <div key={item.productId} style={S.cartItem}>
                      <div style={{ flex: 1 }}>
                        <p style={S.cartItemName}>{item.name}</p>
                        <p style={S.cartItemPrice}>৳ {item.price?.toLocaleString()}</p>
                      </div>
                      <div style={S.qtyRow}>
                        <button style={S.qtyBtn} onClick={() => updateQty(item.productId, item.quantity - 1)}>−</button>
                        <span style={S.qtyNum}>{item.quantity}</span>
                        <button style={S.qtyBtn} onClick={() => updateQty(item.productId, item.quantity + 1)}>+</button>
                      </div>
                      <button style={S.removeBtn} onClick={() => removeFromCart(item.productId)}>✕</button>
                    </div>
                  ))}
                </div>

                <div style={S.cartDivider} />

                <div style={S.cartSummary}>
                  <div style={S.cartTotalRow}>
                    <span style={S.cartTotalLabel}>TOTAL</span>
                    <span style={S.cartTotalValue}>৳ {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                <button style={S.checkoutBtn} onClick={handleOrder}>
                  Place Order
                </button>

                <p style={S.cartNote}>
                  Stripe payment coming soon. Orders are saved as pending.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  wrapper:      { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:           { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/35465718/pexels-photo-35465718.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(.80px)", transform: "scale(1.05)", zIndex: -2 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(255,245,250,0.82)", zIndex: -1 },
  page:         { maxWidth: 1100, margin: "auto", padding: "40px 24px" },

  header:       { textAlign: "center", marginBottom: 36 },
  headerSub:    { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:  { fontSize: 34, fontWeight: 400, color: "#4a2060", margin: "0 0 14px", letterSpacing: 1 },
  divider:      { width: 50, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  headerDesc:   { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 0.5 },

  successBar:   { background: "#d1fae5", color: "#065f46", padding: "12px 20px", borderRadius: 10, textAlign: "center", marginBottom: 20, fontFamily: "sans-serif", fontSize: 14 },

  topRow:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, maxWidth: 500, margin: "0 auto 28px" },
  tabs:         { display: "flex", border: "1px solid #e2c4e2", borderRadius: 30, overflow: "hidden" },
  tab:          { flex: 1, padding: "10px 24px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1 },
  tabActive:    { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff" },

  cartBtn:      { position: "relative", padding: "10px 24px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 30, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  cartBadge:    { position: "absolute", top: -8, right: -8, background: "#e879a8", color: "#fff", borderRadius: "50%", width: 20, height: 20, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" },

  filters:      { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32 },
  filterBtn:    { padding: "7px 16px", borderRadius: 20, border: "1px solid #d4a8d4", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", background: "rgba(255,255,255,0.8)", color: "#7c3aed", letterSpacing: 0.5 },
  filterActive: { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "1px solid transparent" },

  loading:      { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 2 },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20 },

  card:         { background: "rgba(255,255,255,0.92)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(157,107,157,0.1)", transition: "all 0.3s ease" },
  imageBox:     { position: "relative", height: 160, overflow: "hidden" },
  image:        { width: "100%", height: "100%", objectFit: "cover" },
  imagePlaceholder: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, background: "linear-gradient(135deg,#f3e8ff,#fce7f3)" },
  typeBadge:    { position: "absolute", top: 10, right: 10, background: "rgba(157,78,221,0.85)", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: "sans-serif", letterSpacing: 1 },

  cardBody:     { padding: "16px" },
  productName:  { fontSize: 15, fontWeight: 400, color: "#3b0764", margin: "0 0 6px", letterSpacing: 0.3 },
  productDesc:  { fontSize: 12, color: "#6b5b7b", lineHeight: 1.5, marginBottom: 12, fontFamily: "sans-serif" },
  cardFooter:   { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  priceLabel:   { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 2px" },
  price:        { fontSize: 18, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif", margin: 0 },
  stock:        { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif" },
  addBtn:       { width: "100%", padding: "10px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  disabledBtn:  { background: "#e5e7eb", color: "#9ca3af", cursor: "not-allowed" },

  ordersList:   { maxWidth: 700, margin: "0 auto" },
  sectionSub:   { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", marginBottom: 24, letterSpacing: 1 },
  emptyBox:     { textAlign: "center", padding: 48 },
  empty:        { color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 16 },

  orderCard:    { background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(157,107,157,0.1)" },
  orderHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  orderDate:    { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", letterSpacing: 1, margin: "0 0 4px" },
  orderTotal:   { fontSize: 18, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif", margin: 0 },
  statusBadge:  { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  orderItems:   { display: "flex", flexDirection: "column", gap: 8 },
  orderItem:    { display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#faf5ff", borderRadius: 8 },
  orderItemName:{ fontSize: 13, color: "#3b0764", fontFamily: "sans-serif" },
  orderItemQty: { fontSize: 13, color: "#9d6b9d", fontFamily: "sans-serif" },
  orderItemPrice:{ fontSize: 13, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600 },

  cartOverlay:  { position: "fixed", inset: 0, background: "rgba(40,0,60,0.4)", zIndex: 1000 },
  cartSidebar:  { position: "fixed", right: 0, top: 0, bottom: 0, width: 380, background: "#fff", padding: 28, overflowY: "auto", boxShadow: "-10px 0 40px rgba(0,0,0,0.15)" },
  cartHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cartTitle:    { fontSize: 20, fontWeight: 400, color: "#3b0764", margin: 0, letterSpacing: 1 },
  closeBtn:     { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9d6b9d" },
  cartDivider:  { height: 1, background: "#f3e8ff", margin: "16px 0" },
  emptyCart:    { textAlign: "center", padding: 40 },
  cartItems:    { display: "flex", flexDirection: "column", gap: 12 },
  cartItem:     { display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "#faf5ff", borderRadius: 10 },
  cartItemName: { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", margin: "0 0 4px" },
  cartItemPrice:{ fontSize: 13, color: "#7c3aed", fontFamily: "sans-serif", margin: 0, fontWeight: 600 },
  qtyRow:       { display: "flex", alignItems: "center", gap: 8 },
  qtyBtn:       { width: 28, height: 28, borderRadius: "50%", border: "1px solid #e2c4e2", background: "#fff", cursor: "pointer", fontSize: 16, color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum:       { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif", minWidth: 20, textAlign: "center" },
  removeBtn:    { background: "none", border: "none", color: "#c084c4", cursor: "pointer", fontSize: 14 },
  cartSummary:  { padding: "8px 0" },
  cartTotalRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cartTotalLabel:{ fontSize: 11, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif" },
  cartTotalValue:{ fontSize: 22, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif" },
  checkoutBtn:  { width: "100%", padding: 14, background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, marginTop: 16, marginBottom: 12 },
  cartNote:     { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", textAlign: "center", lineHeight: 1.6 },
};