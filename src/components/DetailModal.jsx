import { STATUS_MAP } from "../utils/status";
import { parseDollar, formatDollar } from "../utils/format";
import ReasonCodeBadges from "./ReasonCodeBadges";

export default function DetailModal({ claim, onClose, onWorkClaim, isWorked, onUnwork }) {
  if (!claim) return null;

  const st = STATUS_MAP[claim._status] || STATUS_MAP.adjusted;

  const rows = [
    ["Patient", claim.patient],
    ["Member ID", claim.member_id],
    ["Account #", claim.acnt],
    ["ICN", claim.icn],
    ["Date of Service", claim.dos],
    ["CPT/Proc", claim.cpt],
    ["Payer", claim.payer],
    ["Billed", formatDollar(parseDollar(claim.billed))],
    ["Allowed", formatDollar(parseDollar(claim.allowed))],
    ["Deductible", formatDollar(parseDollar(claim.deduct))],
    ["Coinsurance", formatDollar(parseDollar(claim.coins))],
    ["Copay/Pt Resp", formatDollar(parseDollar(claim.copay))],
    ["Reason Codes", claim.reason_codes],
    ["Remark Codes", claim.rem_codes],
    ["Provider Paid", formatDollar(parseDollar(claim.prov_paid))],
    ["Claim Status", claim.status_text],
  ].filter((r) => r[1] && r[1] !== "$0.00");

  const isMoneyField = (label) =>
    /Billed|Allowed|Paid|Deduct|Coins|Copay/.test(label);

  const isCodeField = (label) =>
    /Reason Codes|Remark Codes/.test(label);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: 28,
          width: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 17 }}>{claim.patient}</h3>
          <span
            className="pill"
            style={{
              background: st.color + "20",
              color: st.color,
            }}
          >
            {st.icon} {st.label}
          </span>
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "7px 0",
                borderBottom: "1px solid rgba(37,45,61,0.2)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: isMoneyField(label)
                    ? "var(--font-mono)"
                    : "inherit",
                  textAlign: "right",
                  maxWidth: 280,
                  wordBreak: "break-all",
                }}
              >
                {isCodeField(label) ? (
                  <ReasonCodeBadges codes={value} style={{ justifyContent: "flex-end" }} />
                ) : (
                  value
                )}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            Close
          </button>
          {onWorkClaim && !isWorked && (
            <button
              onClick={() => {
                onWorkClaim(claim);
                onClose();
              }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Work Claim
            </button>
          )}
          {isWorked && onUnwork && (
            <>
              <button
                onClick={() => {
                  onUnwork(claim);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                Unwork
              </button>
              <button
                onClick={() => {
                  onUnwork(claim);
                  onWorkClaim(claim);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "none",
                  background: "#3b82f6",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                Rework
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
