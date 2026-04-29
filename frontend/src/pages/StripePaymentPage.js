import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51TKNOW6ysDhqV9Wo6HC3L8wSBhNrSsQK1RFOfo2j4ynAly38q4yuBCFLIJRtsPWBxTNRsxVI4yp1wmE3kOmTBWb000HtLxLVOu");

const CARD_STYLE = {
  style: {
    base: {
      color: "#3b0764",
      fontSize: "15px",
      fontFamily: "sans-serif",
      "::placeholder": { color: "#c084c4" },
    },
    invalid: { color: "#ef4444" },
  },
};

// ── Card brand SVG logos ──
const CardIcons = () => (
  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14 }}>
    {/* Visa */}
    <svg width="38" height="24" viewBox="0 0 38 24" style={{ borderRadius: 4, border: "1px solid #e2c4e2" }}>
      <rect width="38" height="24" fill="#1a1f71" rx="4"/>
      <text x="50%" y="16" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="Arial">VISA</text>
    </svg>
    {/* Mastercard */}
    <svg width="38" height="24" viewBox="0 0 38 24" style={{ borderRadius: 4, border: "1px solid #e2c4e2" }}>
      <rect width="38" height="24" fill="#fff" rx="4"/>
      <circle cx="14" cy="12" r="8" fill="#eb001b"/>
      <circle cx="24" cy="12" r="8" fill="#f79e1b"/>
      <path d="M19 6.8a8 8 0 0 1 0 10.4A8 8 0 0 1 19 6.8z" fill="#ff5f00"/>
    </svg>
    {/* Amex */}
    <svg width="38" height="24" viewBox="0 0 38 24" style={{ borderRadius: 4, border: "1px solid #e2c4e2" }}>
      <rect width="38" height="24" fill="#2E77BC" rx="4"/>
      <text x="50%" y="16" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="Arial">AMEX</text>
    </svg>
    {/* Generic card */}
    <svg width="38" height="24" viewBox="0 0 38 24" style={{ borderRadius: 4, border: "1px solid #e2c4e2" }}>
      <rect width="38" height="24" fill="#f3e8ff" rx="4"/>
      <rect x="4" y="7" width="30" height="4" rx="1" fill="#c084c4"/>
      <rect x="4" y="14" width="10" height="3" rx="1" fill="#9d4edd"/>
      <rect x="16" y="14" width="10" height="3" rx="1" fill="#9d4edd"/>
    </svg>
  </div>
);

const CheckoutForm = ({ amount, onSuccess, onCancel, onCOD, metadata }) => {
  const stripe    = useStripe();
  const elements  = useElements();
  const [method, setMethod]       = useState("card"); // "card" | "cod"
  const [processing, setProcessing] = useState(false);
  const [error, setError]         = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    if (method !== "card") return;
    const initPayment = async () => {
      try {
        setError("");
        setReady(false);
        const res = await fetch("http://localhost:5000/api/payment/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Number(amount), metadata }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Server error");
        }
        const data = await res.json();
        if (!data.clientSecret) throw new Error("No clientSecret received");
        setClientSecret(data.clientSecret);
        setReady(true);
      } catch (err) {
        setError("Payment initialization failed: " + err.message);
      }
    };
    if (amount && amount > 0) initPayment();
  }, [amount, method]);

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setProcessing(true);
    setError("");
    const card   = elements.getElement(CardNumberElement);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    if (result.error) {
      setError(result.error.message);
      setProcessing(false);
    } else if (result.paymentIntent.status === "succeeded") {
      onSuccess(result.paymentIntent.id, "card");
    }
  };

  const handleCOD = () => {
    if (onCOD) onCOD();
    else onSuccess("COD_" + Date.now(), "cod");
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <p style={S.headerSub}>SECURE CHECKOUT</p>
            <h2 style={S.headerTitle}>Complete Payment</h2>
            <div style={S.divider} />
          </div>
          <button style={S.closeBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Amount */}
        <div style={S.amountBox}>
          <p style={S.amountLabel}>TOTAL AMOUNT</p>
          <p style={S.amount}>৳ {Number(amount).toLocaleString()}</p>
        </div>

        {/* Payment method selector */}
        <p style={S.methodLabel}>SELECT PAYMENT METHOD</p>
        <div style={S.methodRow}>
          <button
            style={{ ...S.methodBtn, ...(method === "card" ? S.methodActive : {}) }}
            onClick={() => { setMethod("card"); setError(""); }}
          >
            💳 Pay by Card
          </button>
          {metadata?.type === "marketplace" && (
          <button
            style={{ ...S.methodBtn, ...(method === "cod" ? S.methodActiveCOD : {}) }}
            onClick={() => { setMethod("cod"); setError(""); }}
          >
            🏠 Cash on Delivery
          </button>
          )}</div>

        {/* Error */}
        {error && (
          <div style={S.errorBox}>
            <p style={S.errorText}>{error}</p>
          </div>
        )}

        {/* ── CARD PAYMENT ── */}
        {method === "card" && (
          <>
            {!ready && !error && (
              <p style={S.loadingText}>Initializing secure payment...</p>
            )}
            {ready && (
              <form onSubmit={handleCardSubmit}>
                <div style={S.cardSection}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <p style={S.cardSectionTitle}>CARD DETAILS</p>
                    <CardIcons />
                  </div>

                  <div style={S.inputBox}>
                    <label style={S.inputLabel}>Card Number</label>
                    <div style={S.cardField}>
                      <CardNumberElement options={CARD_STYLE} />
                    </div>
                  </div>

                  <div style={S.row}>
                    <div style={S.inputBox}>
                      <label style={S.inputLabel}>Expiry Date</label>
                      <div style={S.cardField}>
                        <CardExpiryElement options={CARD_STYLE} />
                      </div>
                    </div>
                    <div style={S.inputBox}>
                      <label style={S.inputLabel}>CVC</label>
                      <div style={S.cardField}>
                        <CardCvcElement options={CARD_STYLE} />
                      </div>
                    </div>
                  </div>

                  <div style={S.testCard}>
                    <p style={S.testCardTitle}>TEST CARD</p>
                    <p style={S.testCardNum}>4242 4242 4242 4242</p>
                    <p style={S.testCardSub}>Any future date · Any 3-digit CVC</p>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{ ...S.payBtn, ...(processing ? S.payBtnDisabled : {}) }}
                  disabled={processing || !stripe}
                >
                  {processing ? "Processing..." : `Pay ৳ ${Number(amount).toLocaleString()}`}
                </button>
                <button type="button" style={S.cancelBtn} onClick={onCancel}>Cancel</button>
              </form>
            )}
          </>
        )}

        {/* ── CASH ON DELIVERY ── */}
        {method === "cod" && (
          <div style={S.codBox}>
            <div style={S.codIcon}>🏠</div>
            <p style={S.codTitle}>Cash on Delivery</p>
            <p style={S.codDesc}>
              Pay in cash when your order arrives or at the time of service.
              Your booking will be saved as <strong>pending</strong> until confirmed.
            </p>
            <div style={S.codNote}>
              <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontFamily: "sans-serif" }}>
                ⚠️ Please keep the exact amount ready: <strong>৳ {Number(amount).toLocaleString()}</strong>
              </p>
            </div>
            <button style={S.codBtn} onClick={handleCOD}>
              Confirm Cash on Delivery
            </button>
            <button style={S.cancelBtn} onClick={onCancel}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export const StripePayment = (props) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm {...props} />
  </Elements>
);

const S = {
  overlay:         { position: "fixed", inset: 0, background: "rgba(40,0,60,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, padding: 20 },
  modal:           { background: "#fff", borderRadius: 20, padding: "32px", maxWidth: 480, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" },

  header:          { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  headerSub:       { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 4 },
  headerTitle:     { fontSize: 22, fontWeight: 400, color: "#3b0764", margin: "0 0 10px", letterSpacing: 0.5 },
  divider:         { width: 36, height: 2, background: "linear-gradient(90deg,#c084c4,#e879a8)" },
  closeBtn:        { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9d6b9d" },

  amountBox:       { background: "#faf5ff", borderRadius: 12, padding: "16px 20px", marginBottom: 20, textAlign: "center" },
  amountLabel:     { fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", margin: "0 0 6px" },
  amount:          { fontSize: 30, fontWeight: 600, color: "#7c3aed", fontFamily: "sans-serif", margin: 0 },

  methodLabel:     { fontSize: 10, letterSpacing: 2, color: "#c084c4", fontFamily: "sans-serif", marginBottom: 10 },
  methodRow:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  methodBtn:       { padding: "12px 10px", border: "1px solid #e2c4e2", borderRadius: 12, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", color: "#9d6b9d", background: "#faf5ff", transition: "all 0.2s" },
  methodActive:    { border: "2px solid #7c3aed", background: "#f3e8ff", color: "#7c3aed", fontWeight: 600 },
  methodActiveCOD: { border: "2px solid #059669", background: "#d1fae5", color: "#065f46", fontWeight: 600 },

  errorBox:        { background: "#fee2e2", borderRadius: 10, padding: "12px 16px", marginBottom: 16 },
  errorText:       { color: "#991b1b", fontSize: 13, fontFamily: "sans-serif", margin: 0 },
  loadingText:     { textAlign: "center", color: "#9d6b9d", fontFamily: "sans-serif", fontSize: 13, marginBottom: 20 },

  cardSection:     { marginBottom: 20 },
  cardSectionTitle:{ fontSize: 10, letterSpacing: 3, color: "#c084c4", fontFamily: "sans-serif", margin: 0 },
  inputBox:        { marginBottom: 12, flex: 1 },
  inputLabel:      { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", display: "block", marginBottom: 6, letterSpacing: 1 },
  cardField:       { padding: "12px 14px", border: "1px solid #e2c4e2", borderRadius: 10, background: "#faf5ff" },
  row:             { display: "flex", gap: 12 },

  testCard:        { background: "#f3e8ff", borderRadius: 10, padding: "12px 16px", marginTop: 14 },
  testCardTitle:   { fontSize: 9, letterSpacing: 3, color: "#9d4edd", fontFamily: "sans-serif", margin: "0 0 6px" },
  testCardNum:     { fontSize: 16, color: "#3b0764", fontFamily: "monospace", fontWeight: 600, margin: "0 0 4px", letterSpacing: 2 },
  testCardSub:     { fontSize: 11, color: "#9d6b9d", fontFamily: "sans-serif", margin: 0 },

  payBtn:          { width: "100%", padding: 14, background: "linear-gradient(135deg,#7c3aed,#c084c4)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: "sans-serif", letterSpacing: 1, fontWeight: 600, marginBottom: 10 },
  payBtnDisabled:  { opacity: 0.7, cursor: "not-allowed" },
  cancelBtn:       { width: "100%", padding: 12, background: "transparent", border: "1px solid #e2c4e2", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif", color: "#9d6b9d", letterSpacing: 1, marginTop: 8 },

  codBox:          { textAlign: "center", padding: "10px 0" },
  codIcon:         { fontSize: 48, marginBottom: 12 },
  codTitle:        { fontSize: 18, fontWeight: 400, color: "#3b0764", fontFamily: "sans-serif", marginBottom: 10 },
  codDesc:         { fontSize: 13, color: "#6b5b7b", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: 16 },
  codNote:         { background: "#fef3c7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, textAlign: "left" },
  codBtn:          { width: "100%", padding: 14, background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: "sans-serif", fontWeight: 600, marginBottom: 8 },
};