import { useState, useEffect } from "react";
import { StripePayment } from "./StripePaymentPage";
import { downloadReceipt } from "./ReceiptPage";
import axios from "axios";

const API = "http://localhost:5000/api/marketplace";
const TYPES = ["All", "Safety", "Electronics", "Comfort", "Gear"];
const SORT_OPTIONS = [
  { label: "Default",     value: "default"     },
  { label: "Price: Low",  value: "price_asc"   },
  { label: "Price: High", value: "price_desc"  },
  { label: "Name: A–Z",   value: "name_asc"    },
];

// ── Order status timeline steps ──
const ORDER_STEPS = ["Ordered", "Confirmed", "Shipped", "Delivered"];
const getStepIndex = (status, paymentStatus) => {
  if (paymentStatus !== "paid") return 0;
  // You can update this logic once you add delivery status to your schema
  return 1; // Default: Confirmed after payment
};

export default function MarketplacePage() {
  const [products, setProducts]         = useState([]);
  const [cart, setCart]                 = useState([]);
  const [wishlist, setWishlist]         = useState(() => {
    try { return JSON.parse(localStorage.getItem("wishlist") || "[]"); } catch { return []; }
  });
  const [loading, setLoading]           = useState(false);
  const [typeFilter, setType]           = useState("All");
  const [sortBy, setSortBy]             = useState("default");
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeTab, setActiveTab]       = useState("shop");
  const [orders, setOrders]             = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showCart, setShowCart]         = useState(false);
  const [success, setSuccess]           = useState("");
  const [showPayment, setShowPayment]   = useState(false);
  const [paymentData, setPaymentData]   = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ── Fetch products ──
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = typeFilter !== "All" ? { type: typeFilter } : {};
      const { data } = await axios.get(`${API}/products`, { params });
      setProducts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Fetch orders ──
  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${API}/orders/${user._id}`);
      setOrders(data);
    } catch (err) { console.error(err); }
  };

  // ── Filtered + sorted products ──
  const displayedProducts = products
    .filter(p => {
      if (!searchQuery) return true;
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "price_asc")  return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "name_asc")   return a.name.localeCompare(b.name);
      return 0;
    });

  // ── Transaction stats ──
  const paidOrders    = orders.filter(o => o.paymentStatus === "paid");
  const totalSpent    = paidOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalItems    = paidOrders.reduce((s, o) => s + (o.items?.reduce((si, i) => si + i.quantity, 0) || 0), 0);
  const categoryCount = {};
  paidOrders.forEach(o => {
    o.items?.forEach(item => {
      const type = item.productId?.type || "Other";
      categoryCount[type] = (categoryCount[type] || 0) + item.quantity;
    });
  });
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // ── Cart helpers ──
  const addToCart = (product) => {
    const existing = cart.find(c => c.productId === product._id);
    if (existing) {
      setCart(cart.map(c => c.productId === product._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { productId: product._id, name: product.name, price: product.price, image: product.image, quantity: 1 }]);
    }
  };

  const removeFromCart  = (productId) => setCart(cart.filter(c => c.productId !== productId));
  const updateQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(cart.map(c => c.productId === productId ? { ...c, quantity: qty } : c));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // ── Wishlist helpers ──
  const toggleWishlist = (product) => {
    const updated = wishlist.find(w => w._id === product._id)
      ? wishlist.filter(w => w._id !== product._id)
      : [...wishlist, product];
    setWishlist(updated);
    localStorage.setItem("wishlist", JSON.stringify(updated));
  };
  const isWishlisted = (id) => wishlist.some(w => w._id === id);

  // ── Reorder: add all items from a past order back to cart ──
  const handleReorder = (order) => {
    order.items?.forEach(item => {
      const product = {
        _id:   item.productId?._id || item.productId,
        name:  item.productId?.name || item.name || "Product",
        price: item.price,
        image: item.productId?.image || "",
      };
      const existing = cart.find(c => c.productId === product._id);
      if (existing) {
        setCart(prev => prev.map(c => c.productId === product._id ? { ...c, quantity: c.quantity + item.quantity } : c));
      } else {
        setCart(prev => [...prev, { productId: product._id, name: product.name, price: product.price, image: product.image, quantity: item.quantity }]);
      }
    });
    setShowCart(true);
    setActiveTab("shop");
  };

  // ── Place order ──
  const handleOrder = async () => {
    if (cart.length === 0) { alert("Your cart is empty!"); return; }
    try {
      const { data } = await axios.post(`${API}/order`, { userId: user._id, items: cart });
      setPaymentData({ orderId: data.order._id, amount: data.totalPrice });
      setShowCart(false);
      setShowPayment(true);
    } catch (err) { alert(err.response?.data?.error || "Order failed!"); }
  };

  // ── Payment success ──
  const handlePaymentSuccess = async (stripePaymentId) => {
    try {
      await axios.post("http://localhost:5000/api/payment/confirm-order", {
        orderId: paymentData.orderId, stripePaymentId, userId: user._id, amount: paymentData.amount,
      });
      setShowPayment(false);
      setCart([]);
      setSuccess(`Payment successful! Order placed for ৳${paymentData.amount.toLocaleString()}`);
      setTimeout(async () => { await fetchOrders(); setActiveTab("orders"); }, 800);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) { console.error(err); }
  };

  const handlePayNow = (order) => {
    setPaymentData({ orderId: order._id, amount: order.totalPrice });
    setShowPayment(true);
  };

  const handleDownloadReceipt = (order) => {
    downloadReceipt({
      type: "order", name: "Marketplace Order",
      date: new Date(order.orderDate).toLocaleDateString(),
      amount: order.totalPrice, userName: user.name,
      receiptId: order._id?.toString().slice(-8).toUpperCase(),
      details: order.items?.map(item => ({
        label: item.productId?.name || item.name || "Product",
        value: `৳ ${item.price?.toLocaleString()} x ${item.quantity}`,
      })) || [],
    });
  };

  useEffect(() => { fetchProducts(); }, [typeFilter]);
  useEffect(() => { if (activeTab === "orders" || activeTab === "history") fetchOrders(); }, [activeTab]);

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
          <p style={S.headerDesc}>Essential safety products curated for every female traveler.</p>
        </div>

        {success && <div style={S.successBar}>{success}</div>}

        {/* Tabs + Cart */}
        <div style={S.topRow}>
          <div style={S.tabs}>
            {[
              { key: "shop",     label: "Shop"       },
              { key: "wishlist", label: `Wishlist ${wishlist.length > 0 ? `(${wishlist.length})` : ""}` },
              { key: "orders",   label: "My Orders"  },
              { key: "history",  label: "History"    },
            ].map(tab => (
              <button key={tab.key}
                style={{ ...S.tab, ...(activeTab === tab.key ? S.tabActive : {}) }}
                onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
          <button style={S.cartBtn} onClick={() => setShowCart(true)}>
            🛒 Cart {cartCount > 0 && <span style={S.cartBadge}>{cartCount}</span>}
          </button>
        </div>

        {/* ── SHOP ── */}
        {activeTab === "shop" && (
          <div>
            {/* Search + Sort bar */}
            <div style={S.searchBar}>
              <input
                style={S.searchInput}
                placeholder="🔍  Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select style={S.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Type filters */}
            <div style={S.filters}>
              {TYPES.map(t => (
                <button key={t}
                  style={{ ...S.filterBtn, ...(typeFilter === t ? S.filterActive : {}) }}
                  onClick={() => setType(t)}>{t}</button>
              ))}
            </div>

            {loading ? <p style={S.loading}>Loading...</p> : (
              <>
                <p style={S.resultCount}>{displayedProducts.length} product{displayedProducts.length !== 1 ? "s" : ""} found</p>
                <div style={S.grid}>
                  {displayedProducts.map(product => (
                    <div key={product._id} style={S.card}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(157,107,157,0.2)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(157,107,157,0.1)"; }}
                    >
                      <div style={S.imageBox}>
                        {product.image && !product.image.includes("marketplace")
                          ? <img src={product.image} alt={product.name} style={S.image} />
                          : <div style={S.imagePlaceholder}>
                              {product.type === "Safety" ? "🛡️" : product.type === "Electronics" ? "🔋" : product.type === "Comfort" ? "🎒" : "📦"}
                            </div>
                        }
                        <span style={S.typeBadge}>{product.type}</span>
                        {/* Wishlist heart */}
                        <button style={S.heartBtn} onClick={() => toggleWishlist(product)}>
                          {isWishlisted(product._id) ? "❤️" : "🤍"}
                        </button>
                      </div>
                      <div style={S.cardBody}>
                        <h3 style={S.productName}>{product.name}</h3>
                        <p style={S.productDesc}>{product.description?.slice(0, 70)}...</p>
                        <div style={S.cardFooter}>
                          <div>
                            <p style={S.priceLabel}>PRICE</p>
                            <p style={S.price}>৳ {product.price?.toLocaleString()}</p>
                          </div>
                          <p style={{ ...S.stock, color: product.quantity > 0 ? "#059669" : "#ef4444" }}>
                            {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
                          </p>
                        </div>
                        <button
                          style={{ ...S.addBtn, ...(product.quantity === 0 ? S.disabledBtn : {}) }}
                          onClick={() => product.quantity > 0 && addToCart(product)}
                          disabled={product.quantity === 0}
                        >
                          {cart.find(c => c.productId === product._id) ? "Added ✓" : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── WISHLIST ── */}
        {activeTab === "wishlist" && (
          <div>
            <p style={S.sectionSub}>Items you saved for later</p>
            {wishlist.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🤍</p>
                <p style={S.empty}>Your wishlist is empty.</p>
                <button style={S.addBtn} onClick={() => setActiveTab("shop")}>Browse Products</button>
              </div>
            ) : (
              <div style={S.grid}>
                {wishlist.map(product => (
                  <div key={product._id} style={S.card}>
                    <div style={S.imageBox}>
                      {product.image && !product.image.includes("marketplace")
                        ? <img src={product.image} alt={product.name} style={S.image} />
                        : <div style={S.imagePlaceholder}>
                            {product.type === "Safety" ? "🛡️" : product.type === "Electronics" ? "🔋" : product.type === "Comfort" ? "🎒" : "📦"}
                          </div>
                      }
                      <button style={S.heartBtn} onClick={() => toggleWishlist(product)}>❤️</button>
                    </div>
                    <div style={S.cardBody}>
                      <h3 style={S.productName}>{product.name}</h3>
                      <p style={S.price}>৳ {product.price?.toLocaleString()}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button style={{ ...S.addBtn, flex: 1 }} onClick={() => { addToCart(product); setActiveTab("shop"); }}>
                          Add to Cart
                        </button>
                        <button style={{ ...S.removeWishBtn }} onClick={() => toggleWishlist(product)}>
                          Remove
                        </button>
                      </div>
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
                <button style={S.addBtn} onClick={() => setActiveTab("shop")}>Start Shopping</button>
              </div>
            ) : (
              orders.map(order => {
                const stepIndex = getStepIndex(order.status, order.paymentStatus);
                const isExpanded = expandedOrder === order._id;
                return (
                  <div key={order._id} style={S.orderCard}>

                    {/* Order header */}
                    <div style={S.orderHeader}>
                      <div>
                        <p style={S.orderDate}>{new Date(order.orderDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                        <p style={S.orderTotal}>৳ {order.totalPrice?.toLocaleString()}</p>
                        <p style={S.orderMeta}>{order.items?.length} {order.items?.length === 1 ? "item" : "items"}</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                        <span style={{
                          ...S.statusBadge,
                          background: order.paymentStatus === "paid" ? "#d1fae5" : "#fef3c7",
                          color:      order.paymentStatus === "paid" ? "#065f46" : "#92400e",
                        }}>{order.paymentStatus}</span>
                        {order.paymentStatus === "pending" && (
                          <button style={S.payNowBtn} onClick={() => handlePayNow(order)}>Pay Now</button>
                        )}
                        {order.paymentStatus === "paid" && (
                          <>
                            <button style={S.receiptBtn} onClick={() => handleDownloadReceipt(order)}>Download Receipt</button>
                            <button style={S.reorderBtn} onClick={() => handleReorder(order)}> Reorder</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Order timeline */}
                    {order.paymentStatus === "paid" && (
                      <div style={S.timeline}>
                        {ORDER_STEPS.map((step, i) => (
                          <div key={step} style={S.timelineStep}>
                            <div style={{
                              ...S.timelineDot,
                              background: i <= stepIndex ? "#7c3aed" : "#e9d5ff",
                              boxShadow:  i === stepIndex ? "0 0 0 3px #e9d5ff" : "none",
                            }} />
                            {i < ORDER_STEPS.length - 1 && (
                              <div style={{ ...S.timelineLine, background: i < stepIndex ? "#7c3aed" : "#e9d5ff" }} />
                            )}
                            <p style={{ ...S.timelineLabel, color: i <= stepIndex ? "#7c3aed" : "#c084c4", fontWeight: i === stepIndex ? 700 : 400 }}>
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expand / collapse items */}
                    <button style={S.expandBtn} onClick={() => setExpandedOrder(isExpanded ? null : order._id)}>
                      {isExpanded ? "▲ Hide items" : "▼ View items"}
                    </button>

                    {isExpanded && (
                      <div style={S.orderItems}>
                        {order.items?.map((item, idx) => (
                          <div key={idx} style={S.orderItem}>
                            <span style={S.orderItemName}>{item.productId?.name || item.name || "Product"}</span>
                            <span style={S.orderItemQty}>×{item.quantity}</span>
                            <span style={S.orderItemPrice}>৳ {(item.price * item.quantity)?.toLocaleString()}</span>
                          </div>
                        ))}
                        <div style={S.orderItemTotal}>
                          <span style={{ fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" }}>Order Total</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed", fontFamily: "sans-serif" }}>৳ {order.totalPrice?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TRANSACTION HISTORY ── */}
        {activeTab === "history" && (
          <div style={S.ordersList}>
            <p style={S.sectionSub}>Your spending summary</p>

            {/* Stats cards */}
            <div style={S.statsGrid}>
              <div style={S.statCard}>
                <p style={S.statLabel}>TOTAL SPENT</p>
                <p style={S.statValue}>৳ {totalSpent.toLocaleString()}</p>
              </div>
              <div style={S.statCard}>
                <p style={S.statLabel}>TOTAL ORDERS</p>
                <p style={S.statValue}>{paidOrders.length}</p>
              </div>
              <div style={S.statCard}>
                <p style={S.statLabel}>ITEMS BOUGHT</p>
                <p style={S.statValue}>{totalItems}</p>
              </div>
              <div style={S.statCard}>
                <p style={S.statLabel}>TOP CATEGORY</p>
                <p style={S.statValue}>{topCategory}</p>
              </div>
            </div>

            {/* Category breakdown */}
            {Object.keys(categoryCount).length > 0 && (
              <div style={S.breakdownBox}>
                <p style={S.breakdownTitle}>SPENDING BY CATEGORY</p>
                {Object.entries(categoryCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, qty]) => {
                    const catTotal = paidOrders.reduce((s, o) =>
                      s + o.items?.filter(i => (i.productId?.type || "Other") === cat)
                                  .reduce((si, i) => si + i.price * i.quantity, 0), 0);
                    const pct = totalSpent > 0 ? Math.round((catTotal / totalSpent) * 100) : 0;
                    return (
                      <div key={cat} style={S.breakdownRow}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={S.breakdownCat}>{cat}</span>
                          <span style={S.breakdownAmt}>৳ {catTotal.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div style={S.progressBar}>
                          <div style={{ ...S.progressFill, width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Full transaction list */}
            <p style={{ ...S.sectionSub, marginTop: 28 }}>All Transactions</p>
            {orders.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.empty}>No transactions yet.</p>
              </div>
            ) : (
              <div style={S.txList}>
                {orders.map(order => (
                  <div key={order._id} style={S.txRow}>
                    <div style={{ ...S.txIcon, background: order.paymentStatus === "paid" ? "#d1fae5" : "#fef3c7" }}>
                      {order.paymentStatus === "paid" ? "✅" : "⏳"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={S.txTitle}>Order #{order._id?.toString().slice(-6).toUpperCase()}</p>
                      <p style={S.txSub}>
                        {order.items?.length} item{order.items?.length !== 1 ? "s" : ""} · {new Date(order.orderDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ ...S.txAmount, color: order.paymentStatus === "paid" ? "#7c3aed" : "#92400e" }}>
                        ৳ {order.totalPrice?.toLocaleString()}
                      </p>
                      <span style={{
                        ...S.txBadge,
                        background: order.paymentStatus === "paid" ? "#d1fae5" : "#fef3c7",
                        color:      order.paymentStatus === "paid" ? "#065f46" : "#92400e",
                      }}>{order.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CART SIDEBAR ── */}
      {showCart && (
        <div style={S.cartOverlay} onClick={() => setShowCart(false)}>
          <div style={S.cartSidebar} onClick={e => e.stopPropagation()}>
            <div style={S.cartHeader}>
              <div>
                <p style={S.cartSub}>YOUR CART</p>
                <h3 style={S.cartTitle}>{cartCount} {cartCount === 1 ? "item" : "items"}</h3>
              </div>
              <button style={S.closeBtn} onClick={() => setShowCart(false)}>✕</button>
            </div>
            <div style={S.cartDivider} />

            {cart.length === 0 ? (
              <div style={S.emptyCart}>
                <p style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🛒</p>
                <p style={S.empty}>Your cart is empty.</p>
              </div>
            ) : (
              <>
                <div style={S.cartItems}>
                  {cart.map(item => (
                    <div key={item.productId} style={S.cartItem}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={S.cartItemName}>{item.name}</p>
                        <p style={S.cartItemPrice}>৳ {item.price?.toLocaleString()} each</p>
                      </div>
                      <div style={S.qtyRow}>
                        <button style={S.qtyBtn} onClick={() => updateQty(item.productId, item.quantity - 1)}>−</button>
                        <span style={S.qtyNum}>{item.quantity}</span>
                        <button style={S.qtyBtn} onClick={() => updateQty(item.productId, item.quantity + 1)}>+</button>
                      </div>
                      <p style={S.cartLineTotal}>৳ {(item.price * item.quantity).toLocaleString()}</p>
                      <button style={S.removeBtn} onClick={() => removeFromCart(item.productId)} title="Remove">🗑️</button>
                    </div>
                  ))}
                </div>
                <div style={S.cartDivider} />
                <div style={S.cartSummary}>
                  <div style={S.cartTotalRow}>
                    <span style={S.cartTotalLabel}>TOTAL ({cartCount} items)</span>
                    <span style={S.cartTotalValue}>৳ {cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                <button style={S.clearCartBtn} onClick={() => setCart([])}>Clear Cart</button>
                <button style={S.checkoutBtn} onClick={handleOrder}>Place Order & Pay</button>
                <p style={S.cartNote}>Secure payment via Stripe 🔒</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STRIPE ── */}
      {showPayment && paymentData && (
        <StripePayment
          amount={paymentData.amount}
          type="order"
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
          metadata={{ type: "marketplace", orderId: paymentData.orderId }}
        />
      )}
    </div>
  );
}

const S = {
  wrapper:        { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:             { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/35465718/pexels-photo-35465718.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(.80px)", transform: "scale(1.05)", zIndex: -2 },
  overlay:        { position: "fixed", inset: 0, background: "rgba(255,245,250,0.82)", zIndex: -1 },
  page:           { maxWidth: 1100, margin: "auto", padding: "40px 24px" },

  header:         { textAlign: "center", marginBottom: 36 },
  headerSub:      { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:    { fontSize: 34, fontWeight: 400, color: "#4a2060", margin: "0 0 14px", letterSpacing: 1 },
  divider:        { width: 50, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  headerDesc:     { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 0.5 },
  successBar:     { background: "#d1fae5", color: "#065f46", padding: "12px 20px", borderRadius: 10, textAlign: "center", marginBottom: 20, fontFamily: "sans-serif", fontSize: 14 },

  topRow: { display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 28, margin: "0 auto 28px" },
  tabs:           { display: "flex", border: "1px solid #e2c4e2", borderRadius: 30, overflow: "hidden" },
  tab:            { flex: 1, padding: "10px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1, whiteSpace: "nowrap" },
  tabActive:      { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff" },
  cartBtn:        { position: "relative", padding: "10px 20px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 30, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1, marginLeft: 12, flexShrink: 0 },
  cartBadge:      { position: "absolute", top: -8, right: -8, background: "#e879a8", color: "#fff", borderRadius: "50%", width: 20, height: 20, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" },

  searchBar:      { display: "flex", gap: 10, marginBottom: 20, maxWidth: 600, margin: "0 auto 20px" },
  searchInput:    { flex: 1, padding: "10px 16px", border: "1px solid #e2c4e2", borderRadius: 20, fontSize: 13, outline: "none", fontFamily: "sans-serif", background: "rgba(255,255,255,0.9)" },
  sortSelect:     { padding: "10px 14px", border: "1px solid #e2c4e2", borderRadius: 20, fontSize: 12, outline: "none", fontFamily: "sans-serif", background: "rgba(255,255,255,0.9)", color: "#7c3aed", cursor: "pointer" },

  filters:        { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 },
  filterBtn:      { padding: "7px 16px", borderRadius: 20, border: "1px solid #d4a8d4", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", background: "rgba(255,255,255,0.8)", color: "#7c3aed", letterSpacing: 0.5 },
  filterActive:   { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "1px solid transparent" },
  resultCount:    { textAlign: "center", fontSize: 12, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 20, letterSpacing: 1 },

  loading:        { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 2 },
  grid:           { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20 },

  card:           { background: "rgba(255,255,255,0.92)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(157,107,157,0.1)", transition: "all 0.3s ease" },
  imageBox:       { position: "relative", height: 160, overflow: "hidden" },
  image:          { width: "100%", height: "100%", objectFit: "cover" },
  imagePlaceholder:{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, background: "linear-gradient(135deg,#f3e8ff,#fce7f3)" },
  typeBadge:      { position: "absolute", top: 10, left: 10, background: "rgba(157,78,221,0.85)", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: "sans-serif", letterSpacing: 1 },
  heartBtn:       { position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },

  cardBody:       { padding: "16px" },
  productName:    { fontSize: 15, fontWeight: 400, color: "#3b0764", margin: "0 0 6px", letterSpacing: 0.3 },
  productDesc:    { fontSize: 12, color: "#6b5b7b", lineHeight: 1.5, marginBottom: 12, fontFamily: "sans-serif" },
  cardFooter:     { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  priceLabel:     { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 2px" },
  price:          { fontSize: 18, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif", margin: 0 },
  stock:          { fontSize: 11, fontFamily: "sans-serif" },
  addBtn:         { width: "100%", padding: "10px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  disabledBtn:    { background: "#e5e7eb", color: "#9ca3af", cursor: "not-allowed" },
  removeWishBtn:  { padding: "10px 14px", background: "transparent", border: "1px solid #e2c4e2", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", color: "#c084c4" },

  ordersList:     { maxWidth: 720, margin: "0 auto" },
  sectionSub:     { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", marginBottom: 24, letterSpacing: 1 },
  emptyBox:       { textAlign: "center", padding: 48 },
  empty:          { color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 16 },

  orderCard:      { background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(157,107,157,0.1)" },
  orderHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  orderDate:      { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", letterSpacing: 1, margin: "0 0 3px" },
  orderTotal:     { fontSize: 20, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif", margin: "0 0 2px" },
  orderMeta:      { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", margin: 0 },
  statusBadge:    { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },

  // Timeline
  timeline:       { display: "flex", alignItems: "flex-start", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #f5f0fb" },
  timelineStep:   { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" },
  timelineDot:    { width: 12, height: 12, borderRadius: "50%", marginBottom: 4, transition: "all 0.3s" },
  timelineLine:   { position: "absolute", top: 5, left: "50%", width: "100%", height: 2, zIndex: 0 },
  timelineLabel:  { fontSize: 9, fontFamily: "sans-serif", letterSpacing: 0.5, textAlign: "center", marginTop: 2 },

  expandBtn:      { background: "none", border: "none", color: "#9d4edd", fontSize: 11, fontFamily: "sans-serif", cursor: "pointer", padding: "4px 0", letterSpacing: 1, marginBottom: 4 },
  orderItems:     { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 },
  orderItem:      { display: "flex", justifyContent: "space-between", padding: "7px 12px", background: "#faf5ff", borderRadius: 8 },
  orderItemName:  { fontSize: 12, color: "#3b0764", fontFamily: "sans-serif", flex: 1 },
  orderItemQty:   { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", marginRight: 16 },
  orderItemPrice: { fontSize: 12, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600 },
  orderItemTotal: { display: "flex", justifyContent: "space-between", padding: "8px 12px", marginTop: 4, borderTop: "1px solid #e9d5ff" },

  payNowBtn:      { padding: "7px 14px", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  receiptBtn:     { padding: "7px 14px", background: "transparent", border: "1px solid #059669", color: "#059669", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  reorderBtn:     { padding: "7px 14px", background: "transparent", border: "1px solid #9d4edd", color: "#9d4edd", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },

  // Stats
  statsGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 14, marginBottom: 24 },
  statCard:       { background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: "18px 16px", textAlign: "center", boxShadow: "0 2px 12px rgba(157,107,157,0.1)" },
  statLabel:      { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 6 },
  statValue:      { fontSize: 20, fontWeight: 700, color: "#7c3aed", fontFamily: "sans-serif" },

  breakdownBox:   { background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: 20, marginBottom: 24, boxShadow: "0 2px 12px rgba(157,107,157,0.1)" },
  breakdownTitle: { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 16 },
  breakdownRow:   { marginBottom: 14 },
  breakdownCat:   { fontSize: 12, color: "#3b0764", fontFamily: "sans-serif" },
  breakdownAmt:   { fontSize: 12, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600 },
  progressBar:    { height: 6, background: "#f3e8ff", borderRadius: 10, overflow: "hidden" },
  progressFill:   { height: "100%", background: "linear-gradient(90deg,#9d4edd,#c084c4)", borderRadius: 10, transition: "width 0.5s ease" },

  txList:         { display: "flex", flexDirection: "column", gap: 10 },
  txRow:          { display: "flex", alignItems: "center", gap: 14, padding: 16, background: "rgba(255,255,255,0.92)", borderRadius: 12, boxShadow: "0 2px 8px rgba(157,107,157,0.08)" },
  txIcon:         { width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  txTitle:        { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", margin: "0 0 2px", fontWeight: 500 },
  txSub:          { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", margin: 0 },
  txAmount:       { fontSize: 15, fontWeight: 700, fontFamily: "sans-serif", margin: "0 0 3px" },
  txBadge:        { padding: "2px 10px", borderRadius: 20, fontSize: 10, fontFamily: "sans-serif", letterSpacing: 1 },

  // Cart
  cartOverlay:    { position: "fixed", inset: 0, background: "rgba(40,0,60,0.4)", zIndex: 1000 },
  cartSidebar:    { position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "#fff", padding: 28, overflowY: "auto", boxShadow: "-10px 0 40px rgba(0,0,0,0.15)" },
  cartHeader:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  cartSub:        { fontSize: 9, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 3 },
  cartTitle:      { fontSize: 20, fontWeight: 400, color: "#3b0764", margin: 0, letterSpacing: 1 },
  closeBtn:       { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9d6b9d" },
  cartDivider:    { height: 1, background: "#f3e8ff", margin: "16px 0" },
  emptyCart:      { textAlign: "center", padding: 40 },
  cartItems:      { display: "flex", flexDirection: "column", gap: 0 },
  cartItem:       { display: "flex", alignItems: "center", gap: 10, padding: "13px 0", borderBottom: "1px solid #f5f0fb" },
  cartItemName:   { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cartItemPrice:  { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", margin: 0 },
  qtyRow:         { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 },
  qtyBtn:         { width: 26, height: 26, borderRadius: "50%", border: "1px solid #e2c4e2", background: "#fff", cursor: "pointer", fontSize: 15, color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  qtyNum:         { fontSize: 13, color: "#3b0764", fontFamily: "sans-serif", minWidth: 18, textAlign: "center" },
  cartLineTotal:  { fontSize: 13, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600, minWidth: 72, textAlign: "right", flexShrink: 0 },
  removeBtn:      { background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px", opacity: 0.55, flexShrink: 0 },
  cartSummary:    { padding: "4px 0 8px" },
  cartTotalRow:   { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cartTotalLabel: { fontSize: 11, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif" },
  cartTotalValue: { fontSize: 22, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif" },
  clearCartBtn:   { width: "100%", padding: "10px", background: "transparent", border: "1px solid #e2c4e2", borderRadius: 10, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", color: "#c084c4", letterSpacing: 1, marginBottom: 8 },
  checkoutBtn:    { width: "100%", padding: 14, background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", letterSpacing: 2, marginBottom: 12 },
  cartNote:       { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", textAlign: "center", lineHeight: 1.6 },
};