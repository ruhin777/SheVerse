import { useState, useEffect } from "react";
import { StripePayment } from "./StripePaymentPage";
import { downloadReceipt } from "./ReceiptPage";
import axios from "axios";

const API = "http://localhost:5000/api/hotels";
const LOCATIONS = ["All", "Cox's Bazar", "Sajek Valley", "Bandarban", "Sundarbans", "Dhaka", "Rangamati", "Sylhet"];
const ROOM_TYPES = ["Standard", "Deluxe", "Suite"];

const StarRating = ({ value, onChange, readonly = false }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map(star => (
      <span
        key={star}
        onClick={() => !readonly && onChange && onChange(star)}
        style={{
          fontSize: readonly ? 14 : 22,
          cursor: readonly ? "default" : "pointer",
          color: star <= value ? "#f59e0b" : "#e2c4e2",
          transition: "color 0.15s",
        }}
      >★</span>
    ))}
  </div>
);

export default function HotelPage() {
  const [hotels, setHotels]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [location, setLocation]         = useState("All");
  const [selected, setSelected]         = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn]           = useState("");
  const [checkOut, setCheckOut]         = useState("");
  const [bookings, setBookings]         = useState([]);
  const [activeTab, setActiveTab]       = useState("browse");
  const [success, setSuccess]           = useState("");
  const [showPayment, setShowPayment]   = useState(false);
  const [paymentData, setPaymentData]   = useState(null);
  const [reviewHotel, setReviewHotel]   = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewsMap, setReviewsMap]     = useState({});
  const [showReviews, setShowReviews]   = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = {};
      if (location !== "All") params.location = location;
      const { data } = await axios.get(`${API}/all`, { params });
      setHotels(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await axios.get(`${API}/bookings/${user._id}`);
      setBookings(data);
    } catch (err) { console.error(err); }
  };

  const fetchReviews = async (hotelId) => {
    try {
      const { data } = await axios.get(`${API}/${hotelId}/reviews`);
      setReviewsMap(prev => ({ ...prev, [hotelId]: data }));
      setShowReviews(hotelId);
    } catch (err) { console.error(err); }
  };

  const calcNights = () => {
    if (!checkIn || !checkOut) return 0;
    return Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  };

  const getRoomPrice = () => {
    if (!selected) return 0;
    if (selectedRoom && selected.roomTypes?.length > 0) {
      const room = selected.roomTypes.find(r => r.type === selectedRoom);
      return room?.pricePerNight || selected.pricePerNight;
    }
    return selected.pricePerNight;
  };

  const nights    = calcNights();
  const roomPrice = getRoomPrice();
  const totalPrice = nights * roomPrice;

  // ── Book (pending) ──
  const handleBook = async () => {
    if (!checkIn || !checkOut) { alert("Please select dates!"); return; }
    if (nights <= 0) { alert("Check-out must be after check-in!"); return; }
    try {
      await axios.post(`${API}/book`, {
        userId: user._id, hotelId: selected._id,
        checkIn, checkOut,
        roomType: selectedRoom || "Standard",
        pricePerNight: roomPrice,
      });
      setSelected(null); setCheckIn(""); setCheckOut(""); setSelectedRoom(null);
      setSuccess("Booking saved! You can pay later from My Bookings.");
      fetchBookings(); setActiveTab("bookings");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) { alert(err.response?.data?.error || "Booking failed!"); }
  };

  // ── Book & pay now → open payment modal ──
  const handleBookAndPay = async () => {
    if (!checkIn || !checkOut) { alert("Please select dates!"); return; }
    if (nights <= 0) { alert("Check-out must be after check-in!"); return; }
    try {
      const { data } = await axios.post(`${API}/book`, {
        userId: user._id, hotelId: selected._id,
        checkIn, checkOut,
        roomType: selectedRoom || "Standard",
        pricePerNight: roomPrice,
      });
      setPaymentData({
        bookingId:    data.booking._id,
        amount:       data.totalPrice,
        hotel:        selected,
        nights,
        roomType:     selectedRoom || "Standard",
      });
      setSelected(null); setCheckIn(""); setCheckOut(""); setSelectedRoom(null);
      setShowPayment(true);
    } catch (err) { alert("Booking failed!"); }
  };

  // ── Pay from My Bookings ──
  const handlePayNow = (booking) => {
    const n     = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const price = booking.pricePerNight || booking.hotelId?.pricePerNight || 0;
    const total = n * price;
    setPaymentData({
      bookingId: booking._id,
      amount:    total,
      hotel:     booking.hotelId,
      nights:    n,
      roomType:  booking.roomType || "Standard",
    });
    setShowPayment(true);
  };

  // ── Payment success (card or COD) ──
  const handlePaymentSuccess = async (stripePaymentId, method = "card") => {
    try {
      await axios.post("http://localhost:5000/api/payment/confirm-hotel", {
        bookingId: paymentData.bookingId,
        stripePaymentId,
        userId:    user._id,
        amount:    paymentData.amount,
        method,
      });
      setShowPayment(false);
      setSuccess(
        method === "cod"
          ? `Cash on Delivery confirmed! ${paymentData.hotel?.name} is booked.`
          : `Payment successful! ${paymentData.hotel?.name} is confirmed.`
      );
      fetchBookings();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) { console.error(err); }
  };

  // ── Submit review ──
  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) { alert("Please write a comment!"); return; }
    try {
      await axios.post(`${API}/${reviewHotel}/reviews`, {
        userId:   user._id,
        userName: user.name,
        rating:   reviewRating,
        comment:  reviewComment,
      });
      setReviewHotel(null); setReviewRating(5); setReviewComment("");
      setSuccess("Review submitted! Thank you.");
      setTimeout(() => setSuccess(""), 4000);
      fetchReviews(reviewHotel);
    } catch (err) { console.error(err); }
  };

  const handleDownloadReceipt = async (booking) => {
    const n     = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const price = booking.pricePerNight || booking.hotelId?.pricePerNight || 0;
    const total = n * price;
    await downloadReceipt({
      type:      "hotel",
      name:      booking.hotelId?.name,
      date:      new Date().toLocaleDateString(),
      amount:    total,
      userName:  user.name,
      receiptId: booking._id?.toString().slice(-8).toUpperCase(),
      details: [
        { label: "Hotel",          value: booking.hotelId?.name },
        { label: "Location",       value: booking.hotelId?.location },
        { label: "Room Type",      value: booking.roomType || "Standard" },
        { label: "Check-in",       value: new Date(booking.checkIn).toLocaleDateString() },
        { label: "Check-out",      value: new Date(booking.checkOut).toLocaleDateString() },
        { label: "Nights",         value: n },
        { label: "Rate per night", value: `৳ ${price?.toLocaleString()}` },
        { label: "Payment",        value: booking.paymentMethod === "cod" ? "Cash on Delivery" : "Card" },
      ],
    });
  };

  useEffect(() => { fetchHotels(); }, [location]);
  useEffect(() => { if (activeTab === "bookings") fetchBookings(); }, [activeTab]);

  return (
    <div style={S.wrapper}>
      <div style={S.bg} />
      <div style={S.overlay} />

      <div style={S.page}>
        <div style={S.header}>
          <p style={S.headerSub}>VERIFIED SAFE ACCOMMODATIONS</p>
          <h1 style={S.headerTitle}>Hotel Booking</h1>
          <div style={S.divider} />
          <p style={S.headerDesc}>All hotels are safety-verified for solo female travelers.</p>
        </div>

        {success && <div style={S.successBar}>{success}</div>}

        <div style={S.tabs}>
          {[{ key: "browse", label: "Browse Hotels" }, { key: "bookings", label: "My Bookings" }].map(tab => (
            <button key={tab.key}
              style={{ ...S.tab, ...(activeTab === tab.key ? S.tabActive : {}) }}
              onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
          ))}
        </div>

        {/* ── BROWSE ── */}
        {activeTab === "browse" && (
          <div>
            <div style={S.filters}>
              {LOCATIONS.map(l => (
                <button key={l}
                  style={{ ...S.filterBtn, ...(location === l ? S.filterActive : {}) }}
                  onClick={() => setLocation(l)}>{l}</button>
              ))}
            </div>
            {loading ? <p style={S.loading}>Loading...</p> : (
              <div style={S.grid}>
                {hotels.map(hotel => {
                  const avgRating = hotel.reviews?.length
                    ? (hotel.reviews.reduce((s, r) => s + r.rating, 0) / hotel.reviews.length).toFixed(1)
                    : hotel.rating;
                  return (
                    <div key={hotel._id} style={S.card}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(157,107,157,0.2)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(157,107,157,0.1)"; }}>
                      <div style={S.imageBox}>
                        <img src={hotel.image} alt={hotel.name} style={S.image} onError={e => { e.target.style.display = "none"; }} />
                        {hotel.safetyVerified && <span style={S.verifiedBadge}>✓ Safety Verified</span>}
                      </div>
                      <div style={S.cardBody}>
                        <p style={S.hotelLocation}>{hotel.location}</p>
                        <h3 style={S.hotelName}>{hotel.name}</h3>
                        <p style={S.hotelDesc}>{hotel.description?.slice(0, 80)}...</p>

                        {/* Rating row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <StarRating value={Math.round(avgRating)} readonly />
                          <span style={{ fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" }}>
                            {avgRating} ({hotel.reviews?.length || 0} reviews)
                          </span>
                        </div>

                        <div style={S.amenities}>
                          {hotel.amenities?.slice(0, 3).map(a => <span key={a} style={S.amenityTag}>{a}</span>)}
                        </div>

                        {/* Room types */}
                        {hotel.roomTypes?.length > 0 && (
                          <div style={S.roomTypes}>
                            <p style={S.roomTypesLabel}>ROOM TYPES</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {hotel.roomTypes.map(r => (
                                <span key={r.type} style={S.roomBadge}>
                                  {r.type} · ৳{r.pricePerNight?.toLocaleString()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={S.cardFooter}>
                          <div>
                            <p style={S.priceLabel}>FROM / NIGHT</p>
                            <p style={S.price}>৳ {
                              hotel.roomTypes?.length > 0
                                ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight)).toLocaleString()
                                : hotel.pricePerNight?.toLocaleString()
                            }</p>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={{ ...S.bookBtn, flex: 2 }} onClick={() => { setSelected(hotel); setSelectedRoom(hotel.roomTypes?.[0]?.type || "Standard"); }}>
                            Book Now
                          </button>
                          <button style={{ ...S.reviewsBtn, flex: 1 }} onClick={() => fetchReviews(hotel._id)}>
                            Reviews
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MY BOOKINGS ── */}
        {activeTab === "bookings" && (
          <div style={S.bookingsList}>
            <p style={S.sectionSub}>Your hotel reservations</p>
            {bookings.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.empty}>No bookings yet.</p>
                <button style={S.bookBtn} onClick={() => setActiveTab("browse")}>Browse Hotels</button>
              </div>
            ) : (
              bookings.map(b => {
                const n     = Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (1000 * 60 * 60 * 24));
                const price = b.pricePerNight || b.hotelId?.pricePerNight || 0;
                const total = n * price;
                return (
                  <div key={b._id} style={S.bookingCard}>
                    <img src={b.hotelId?.image} alt={b.hotelId?.name} style={S.bookingImg}
                      onError={e => { e.target.style.display = "none"; }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={S.bookingName}>{b.hotelId?.name}</h4>
                      <p style={S.bookingInfo}>{b.hotelId?.location}</p>
                      <p style={S.bookingInfo}>
                        {new Date(b.checkIn).toLocaleDateString()} — {new Date(b.checkOut).toLocaleDateString()} · {n} nights
                      </p>
                      <p style={S.bookingInfo}>
                        Room: <strong>{b.roomType || "Standard"}</strong> · ৳{price?.toLocaleString()}/night
                      </p>
                      <p style={S.bookingTotal}>৳ {total?.toLocaleString()}</p>
                      {b.paymentMethod === "cod" && (
                        <span style={S.codTag}>💵 Cash on Delivery</span>
                      )}
                    </div>
                    <div style={S.bookingActions}>
                      <span style={{
                        ...S.statusBadge,
                        background: b.paymentStatus === "paid" ? "#d1fae5" : "#fef3c7",
                        color:      b.paymentStatus === "paid" ? "#065f46" : "#92400e",
                      }}>{b.paymentStatus}</span>
                      {b.paymentStatus === "pending" && (
                        <button style={S.payNowBtn} onClick={() => handlePayNow(b)}>Pay Now</button>
                      )}
                      {b.paymentStatus === "paid" && (
                        <>
                          <button style={S.receiptBtn} onClick={() => handleDownloadReceipt(b)}>
                            Receipt
                          </button>
                          <button style={S.writeReviewBtn} onClick={() => { setReviewHotel(b.hotelId?._id); setReviewRating(5); setReviewComment(""); }}>
                            Write Review
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── BOOKING MODAL ── */}
      {selected && (
        <div style={S.modalOverlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <p style={S.modalSub}>BOOK YOUR STAY</p>
                <h2 style={S.modalTitle}>{selected.name}</h2>
              </div>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={S.modalDivider} />

            <div style={S.modalHotelInfo}>
              <img src={selected.image} alt={selected.name} style={S.modalImg} onError={e => { e.target.style.display = "none"; }} />
              <div>
                <p style={S.modalLocation}>{selected.location}</p>
                <div style={S.amenities}>
                  {selected.amenities?.map(a => <span key={a} style={S.amenityTag}>{a}</span>)}
                </div>
              </div>
            </div>
            <div style={S.modalDivider} />

            {/* Room type selector */}
            {selected.roomTypes?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={S.label}>SELECT ROOM TYPE</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.roomTypes.map(room => (
                    <div
                      key={room.type}
                      onClick={() => setSelectedRoom(room.type)}
                      style={{
                        ...S.roomOption,
                        ...(selectedRoom === room.type ? S.roomOptionActive : {}),
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, color: "#3b0764", fontWeight: 600 }}>{room.type}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" }}>{room.description}</p>
                        {room.amenities?.length > 0 && (
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#c084c4", fontFamily: "sans-serif" }}>
                            {room.amenities.join(" · ")}
                          </p>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#7c3aed", fontFamily: "sans-serif" }}>
                        ৳ {room.pricePerNight?.toLocaleString()}/night
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={S.dateRow}>
              <div style={S.inputGroup}>
                <label style={S.label}>CHECK-IN DATE</label>
                <input style={S.input} type="date" value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split("T")[0]} />
              </div>
              <div style={S.inputGroup}>
                <label style={S.label}>CHECK-OUT DATE</label>
                <input style={S.input} type="date" value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split("T")[0]} />
              </div>
            </div>

            {nights > 0 && (
              <div style={S.summary}>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Room Type</span>
                  <span style={S.summaryValue}>{selectedRoom || "Standard"}</span>
                </div>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Nights</span>
                  <span style={S.summaryValue}>{nights}</span>
                </div>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>Rate per night</span>
                  <span style={S.summaryValue}>৳ {roomPrice?.toLocaleString()}</span>
                </div>
                <div style={S.modalDivider} />
                <div style={S.summaryRow}>
                  <span style={{ ...S.summaryLabel, fontWeight: 700, color: "#3b0764" }}>Total</span>
                  <span style={{ ...S.summaryValue, fontWeight: 700, color: "#7c3aed", fontSize: 18 }}>
                    ৳ {totalPrice?.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div style={S.modalBtnRow}>
              <button style={S.bookLaterBtn} onClick={handleBook}>Book · Pay Later</button>
              <button style={S.confirmBtn} onClick={handleBookAndPay}>Book & Pay Now</button>
            </div>
            <p style={S.modalNote}>"Book · Pay Later" saves your reservation as pending.</p>
          </div>
        </div>
      )}

      {/* ── REVIEWS MODAL ── */}
      {showReviews && (
        <div style={S.modalOverlay} onClick={() => setShowReviews(null)}>
          <div style={{ ...S.modal, maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>Guest Reviews</h2>
              <button style={S.closeBtn} onClick={() => setShowReviews(null)}>✕</button>
            </div>
            <div style={S.modalDivider} />
            {(reviewsMap[showReviews] || []).length === 0 ? (
              <p style={{ color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 13, textAlign: "center", padding: 20 }}>
                No reviews yet. Be the first to review!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto" }}>
                {(reviewsMap[showReviews] || []).map((r, i) => (
                  <div key={i} style={S.reviewCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#3b0764" }}>{r.userName || "Guest"}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#c084c4", fontFamily: "sans-serif" }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StarRating value={r.rating} readonly />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#6b5b7b", fontFamily: "sans-serif", lineHeight: 1.5 }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WRITE REVIEW MODAL ── */}
      {reviewHotel && (
        <div style={S.modalOverlay} onClick={() => setReviewHotel(null)}>
          <div style={{ ...S.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <p style={S.modalSub}>SHARE YOUR EXPERIENCE</p>
                <h2 style={S.modalTitle}>Write a Review</h2>
              </div>
              <button style={S.closeBtn} onClick={() => setReviewHotel(null)}>✕</button>
            </div>
            <div style={S.modalDivider} />
            <div style={{ marginBottom: 16 }}>
              <p style={S.label}>YOUR RATING</p>
              <StarRating value={reviewRating} onChange={setReviewRating} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={S.label}>YOUR REVIEW</p>
              <textarea
                style={{ ...S.input, height: 100, resize: "vertical", fontFamily: "sans-serif" }}
                placeholder="Share your experience at this hotel..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
            </div>
            <button style={S.confirmBtn} onClick={handleSubmitReview}>Submit Review</button>
            <button style={{ ...S.bookLaterBtn, marginTop: 8, width: "100%", display: "block" }} onClick={() => setReviewHotel(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── STRIPE / COD PAYMENT ── */}
      {showPayment && paymentData && (
        <StripePayment
          amount={paymentData.amount}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
          metadata={{ type: "hotel", bookingId: paymentData.bookingId }}
        />
      )}
    </div>
  );
}

const S = {
  wrapper:        { position: "relative", minHeight: "100vh", fontFamily: "'Georgia', serif" },
  bg:             { position: "fixed", inset: 0, backgroundImage: "url('https://images.pexels.com/photos/36386162/pexels-photo-36386162.jpeg')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(.80px)", transform: "scale(1.05)", zIndex: -2 },
  overlay:        { position: "fixed", inset: 0, background: "rgba(255,245,250,0.82)", zIndex: -1 },
  page:           { maxWidth: 1100, margin: "auto", padding: "40px 24px" },
  header:         { textAlign: "center", marginBottom: 36 },
  headerSub:      { fontSize: 10, letterSpacing: 4, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 8 },
  headerTitle:    { fontSize: 34, fontWeight: 400, color: "#4a2060", margin: "0 0 14px", letterSpacing: 1 },
  divider:        { width: 50, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)", margin: "0 auto 16px" },
  headerDesc:     { fontSize: 14, color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 0.5 },
  successBar:     { background: "#d1fae5", color: "#065f46", padding: "12px 20px", borderRadius: 10, textAlign: "center", marginBottom: 20, fontFamily: "sans-serif", fontSize: 14 },
  tabs:           { display: "flex", justifyContent: "center", marginBottom: 32, border: "1px solid #e2c4e2", borderRadius: 30, overflow: "hidden", maxWidth: 320, margin: "0 auto 32px" },
  tab:            { flex: 1, padding: "11px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1 },
  tabActive:      { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff" },
  filters:        { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32 },
  filterBtn:      { padding: "7px 16px", borderRadius: 20, border: "1px solid #d4a8d4", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", background: "rgba(255,255,255,0.8)", color: "#7c3aed", letterSpacing: 0.5 },
  filterActive:   { background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "1px solid transparent" },
  loading:        { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", letterSpacing: 2 },
  grid:           { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 24 },
  card:           { background: "rgba(255,255,255,0.92)", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(157,107,157,0.1)", transition: "all 0.3s ease" },
  imageBox:       { position: "relative", height: 200, overflow: "hidden" },
  image:          { width: "100%", height: "100%", objectFit: "cover" },
  verifiedBadge:  { position: "absolute", top: 12, left: 12, background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontFamily: "sans-serif", letterSpacing: 1 },
  cardBody:       { padding: "20px" },
  hotelLocation:  { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 4px" },
  hotelName:      { fontSize: 18, fontWeight: 400, color: "#3b0764", margin: "0 0 8px", letterSpacing: 0.5 },
  hotelDesc:      { fontSize: 13, color: "#6b5b7b", lineHeight: 1.6, marginBottom: 10, fontFamily: "sans-serif" },
  amenities:      { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  amenityTag:     { padding: "3px 10px", background: "#f3e8ff", borderRadius: 20, fontSize: 11, color: "#7c3aed", fontFamily: "sans-serif" },
  roomTypes:      { marginBottom: 10 },
  roomTypesLabel: { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 6px" },
  roomBadge:      { padding: "3px 10px", background: "#fce7f3", borderRadius: 20, fontSize: 11, color: "#be185d", fontFamily: "sans-serif" },
  cardFooter:     { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  priceLabel:     { fontSize: 9, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 2px" },
  price:          { fontSize: 20, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif", margin: 0 },
  bookBtn:        { padding: "11px", background: "linear-gradient(135deg,#9d4edd,#c77dff)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", letterSpacing: 1 },
  reviewsBtn:     { padding: "11px", background: "transparent", border: "1px solid #e2c4e2", color: "#9d6b9d", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  bookingsList:   { maxWidth: 700, margin: "0 auto" },
  sectionSub:     { textAlign: "center", color: "#9d6b9d", fontSize: 13, fontFamily: "sans-serif", marginBottom: 24, letterSpacing: 1 },
  emptyBox:       { textAlign: "center", padding: 48 },
  empty:          { color: "#9d6b9d", fontFamily: "sans-serif", marginBottom: 16 },
  bookingCard:    { display: "flex", gap: 16, alignItems: "center", padding: 20, background: "rgba(255,255,255,0.92)", borderRadius: 14, marginBottom: 12, boxShadow: "0 2px 12px rgba(157,107,157,0.1)", flexWrap: "wrap" },
  bookingImg:     { width: 80, height: 64, borderRadius: 10, objectFit: "cover" },
  bookingName:    { fontSize: 16, fontWeight: 400, color: "#3b0764", margin: "0 0 4px" },
  bookingInfo:    { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif", margin: "2px 0" },
  bookingTotal:   { fontSize: 14, color: "#7c3aed", fontFamily: "sans-serif", fontWeight: 600, margin: "4px 0 0" },
  bookingActions: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" },
  statusBadge:    { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1, whiteSpace: "nowrap" },
  payNowBtn:      { padding: "8px 16px", background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  receiptBtn:     { padding: "8px 16px", background: "transparent", border: "1px solid #059669", color: "#059669", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  writeReviewBtn: { padding: "8px 16px", background: "transparent", border: "1px solid #9d4edd", color: "#9d4edd", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "sans-serif", letterSpacing: 1 },
  codTag:         { fontSize: 11, color: "#065f46", fontFamily: "sans-serif", background: "#d1fae5", padding: "2px 8px", borderRadius: 20, display: "inline-block", marginTop: 4 },
  modalOverlay:   { position: "fixed", inset: 0, background: "rgba(40,0,60,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 },
  modal:          { background: "#fff", padding: "36px", borderRadius: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,0.3)" },
  modalHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalSub:       { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  modalTitle:     { fontSize: 22, fontWeight: 400, color: "#3b0764", margin: 0 },
  closeBtn:       { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9d6b9d" },
  modalDivider:   { height: 1, background: "#f3e8ff", margin: "16px 0" },
  modalHotelInfo: { display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 8 },
  modalImg:       { width: 100, height: 72, borderRadius: 10, objectFit: "cover" },
  modalLocation:  { fontSize: 11, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 8px" },
  roomOption:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #e2c4e2", borderRadius: 10, cursor: "pointer", background: "#faf5ff", transition: "all 0.2s" },
  roomOptionActive:{ border: "2px solid #7c3aed", background: "#f3e8ff" },
  dateRow:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  inputGroup:     { display: "flex", flexDirection: "column", gap: 6 },
  label:          { fontSize: 10, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  input:          { padding: "11px 14px", border: "1px solid #e2c4e2", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "sans-serif", width: "100%", boxSizing: "border-box" },
  summary:        { background: "#faf5ff", borderRadius: 12, padding: "16px 20px", marginBottom: 20 },
  summaryRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryLabel:   { fontSize: 12, color: "#9d6b9d", fontFamily: "sans-serif" },
  summaryValue:   { fontSize: 14, color: "#3b0764", fontFamily: "sans-serif" },
  modalBtnRow:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  bookLaterBtn:   { padding: 13, background: "transparent", border: "1px solid #9d4edd", color: "#9d4edd", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  confirmBtn:     { width: "100%", padding: 13, background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" },
  modalNote:      { fontSize: 11, color: "#c084c4", fontFamily: "sans-serif", textAlign: "center", lineHeight: 1.6 },
  reviewCard:     { background: "#faf5ff", borderRadius: 12, padding: "14px 16px", border: "1px solid #f0e8f8" },
};