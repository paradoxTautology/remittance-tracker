import { STATUS_MAP } from "../utils/status";
import { parseDollar, formatDollar } from "../utils/format";
import ReasonCodeBadges from "./ReasonCodeBadges";

const ACTION_CONFIG = {
  appeal: { label: "Appealed", color: "#e8963a", icon: "⟳" },
  resubmit: { label: "Resubmitted", color: "#4db8a0", icon: "⟳" },
  email_payer: { label: "Emailed Payer", color: "#d4a838", icon: "✉" },
  awaiting_info: { label: "Awaiting Info", color: "#d4a838", icon: "⏳" },
  contact_payer: { label: "Contacted Payer", color: "#b07cc8", icon: "✆" },
  bill_patient: { label: "Billed Patient", color: "#c87c5a", icon: "$" },
  submit_secondary: { label: "Sent to Secondary", color: "#5b9bd5", icon: "→" },
  write_off: { label: "Written Off", color: "#8a8078", icon: "—" },
  other: { label: "Other", color: "#c2703e", icon: "✎" },
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((new Date() - new Date(iso)) / (1000 * 60 * 60 * 24));
}

export default function DetailModal({ claim, onClose, onWorkClaim, history = [] }) {
  if (!claim) return null;

  const st = STATUS_MAP[claim._status] || STATUS_MAP.adjusted;

  const rows = [
    ["Patient", claim.patient],
    ["Member ID", claim.member_id],
    ["Invoice #", (claim.acnt || "").replace(/^0+/, "")],
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

  const hasHistory = history.length > 0;

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
          background: "#221f1b",
          borderRadius: 14,
          padding: 28,
          width: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          border: "1px solid #342f28",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 17, color: "#e8dfd0" }}>{claim.patient}</h3>
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

        {/* Claim details */}
        <div style={{ display: "grid", gap: 4 }}>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "7px 0",
                borderBottom: "1px solid rgba(52,47,40,0.3)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "#7a7060",
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

        {/* Claim History Timeline */}
        {hasHistory && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#7a7060",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 10,
              }}
            >
              Claim History
            </div>
            <div style={{ position: "relative", paddingLeft: 20 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 6,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: "#342f28",
                  borderRadius: 1,
                }}
              />

              {history.map((entry, i) => {
                const ac = ACTION_CONFIG[entry.action] || ACTION_CONFIG.other;
                const isLatest = i === history.length - 1;
                const isResolved = entry.status === "resolved";
                const isPending = entry.status === "pending";
                const days = daysAgo(entry.workedDate);

                return (
                  <div
                    key={entry.id}
                    style={{
                      position: "relative",
                      marginBottom: i < history.length - 1 ? 12 : 0,
                    }}
                  >
                    {/* Dot on the timeline */}
                    <div
                      style={{
                        position: "absolute",
                        left: -17,
                        top: 5,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: isResolved
                          ? "#6db856"
                          : isPending
                          ? ac.color
                          : "#8a8078",
                        border: `2px solid #221f1b`,
                      }}
                    />

                    {/* Entry card */}
                    <div
                      style={{
                        padding: "10px 14px",
                        background: isLatest ? "#2a2620" : "#262320",
                        borderRadius: 8,
                        borderLeft: `2px solid ${isResolved ? "#6db856" : isPending ? ac.color : "#8a8078"}`,
                      }}
                    >
                      {/* Top line */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{ac.icon}</span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: ac.color,
                          }}
                        >
                          {ac.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 7px",
                            borderRadius: 10,
                            background: isResolved
                              ? "#6db85620"
                              : isPending
                              ? "#d4a83820"
                              : "#8a807820",
                            color: isResolved
                              ? "#6db856"
                              : isPending
                              ? "#d4a838"
                              : "#8a8078",
                          }}
                        >
                          {isResolved ? "Resolved" : isPending ? "Pending" : "Written Off"}
                        </span>
                        <span style={{ fontSize: 10, color: "#7a7060", marginLeft: "auto" }}>
                          {formatDate(entry.workedDate)}
                          {days !== null && days > 0 && ` · ${days}d ago`}
                        </span>
                      </div>

                      {/* Notes */}
                      {entry.notes && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#bfb5a3",
                            lineHeight: 1.5,
                            marginTop: 4,
                            padding: "5px 8px",
                            background: "#221f1b",
                            borderRadius: 6,
                          }}
                        >
                          {entry.notes}
                        </div>
                      )}

                      {/* Follow-up */}
                      {entry.followUpDate && isPending && (
                        <div
                          style={{
                            fontSize: 10,
                            color:
                              new Date(entry.followUpDate) < new Date()
                                ? "#d4604a"
                                : "#7a7060",
                            marginTop: 4,
                          }}
                        >
                          Follow-up: {formatDate(entry.followUpDate)}
                          {new Date(entry.followUpDate) < new Date() && " · OVERDUE"}
                        </div>
                      )}

                      {/* Resolved info */}
                      {isResolved && entry.resolvedPaid > 0 && (
                        <div style={{ fontSize: 11, color: "#6db856", marginTop: 4, fontWeight: 600 }}>
                          Paid {formatDollar(entry.resolvedPaid)} on {formatDate(entry.resolvedDate)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #342f28",
              background: "transparent",
              color: "#bfb5a3",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            Close
          </button>
          {onWorkClaim && (
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
                background: "#c2703e",
                color: "#1a1714",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {hasHistory ? "Add Update" : "Work Claim"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
