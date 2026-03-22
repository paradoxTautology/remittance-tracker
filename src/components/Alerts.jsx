import { useState } from "react";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysAgo(iso) {
  if (!iso) return 0;
  return Math.floor((new Date() - new Date(iso)) / (1000 * 60 * 60 * 24));
}

function daysUntil(iso) {
  if (!iso) return 0;
  return Math.floor((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function Alerts({ entries, onNavigate }) {
  const [dismissed, setDismissed] = useState(new Set());

  // Awaiting response (email_payer or awaiting_info with pending status)
  const awaiting = entries.filter(
    (e) =>
      e.status === "pending" &&
      ["email_payer", "awaiting_info"].includes(e.action) &&
      !dismissed.has(e.id)
  );

  // Overdue follow-ups (follow-up date passed, still pending)
  const overdue = entries.filter(
    (e) =>
      e.status === "pending" &&
      e.followUpDate &&
      new Date(e.followUpDate) < new Date() &&
      !["email_payer", "awaiting_info"].includes(e.action) &&
      !dismissed.has(e.id)
  );

  // Recently resolved (within last 3 days)
  const recentResolved = entries.filter(
    (e) =>
      e.status === "resolved" &&
      e.resolvedDate &&
      daysAgo(e.resolvedDate) <= 3 &&
      !dismissed.has(e.id)
  );

  const total = awaiting.length + overdue.length + recentResolved.length;
  if (total === 0) return null;

  const dismiss = (id) => setDismissed((prev) => new Set([...prev, id]));

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Awaiting Response */}
      {awaiting.length > 0 && (
        <div
          style={{
            background: "rgba(234, 179, 8, 0.08)",
            border: "1px solid rgba(234, 179, 8, 0.25)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>✉</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#c8aa64",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Awaiting Response ({awaiting.length})
            </span>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {awaiting.map((e) => {
              const days = daysAgo(e.workedDate);
              const followDays = e.followUpDate ? daysUntil(e.followUpDate) : null;
              return (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8dfd0" }}>
                        {e.patient}
                      </div>
                      <div style={{ fontSize: 11, color: "#bfb5a3", marginTop: 2 }}>
                        {e.notes || "No notes"}
                        <span style={{ color: "#7a7060" }}> · {days}d ago</span>
                        {followDays !== null && followDays <= 0 && (
                          <span style={{ color: "#c0785a", fontWeight: 600 }}> · OVERDUE</span>
                        )}
                        {followDays !== null && followDays > 0 && (
                          <span style={{ color: "#7a7060" }}> · follow up in {followDays}d</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => {
                        onNavigate("worklog");
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(200,170,100,0.3)",
                        background: "rgba(200,170,100,0.1)",
                        color: "#c8aa64",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => dismiss(e.id)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "#7a7060",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "inherit",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overdue Follow-Ups */}
      {overdue.length > 0 && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#c0785a",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Overdue Follow-Ups ({overdue.length})
            </span>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {overdue.map((e) => {
              const overdueDays = Math.abs(daysUntil(e.followUpDate));
              return (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e8dfd0" }}>
                      {e.patient}
                    </div>
                    <div style={{ fontSize: 11, color: "#bfb5a3", marginTop: 2 }}>
                      Follow-up was {formatDate(e.followUpDate)}
                      <span style={{ color: "#c0785a", fontWeight: 600 }}> · {overdueDays}d overdue</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => onNavigate("worklog")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(192,120,90,0.3)",
                        background: "rgba(192,120,90,0.1)",
                        color: "#c0785a",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => dismiss(e.id)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "#7a7060",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "inherit",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Resolved */}
      {recentResolved.length > 0 && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.25)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>✓</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#8aad72",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Recently Resolved ({recentResolved.length})
            </span>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {recentResolved.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e8dfd0" }}>
                    {e.patient}
                  </div>
                  <div style={{ fontSize: 11, color: "#8aad72", marginTop: 2 }}>
                    Resolved {formatDate(e.resolvedDate)}
                    {e.resolvedPaid > 0 && ` · Paid $${e.resolvedPaid.toFixed(2)}`}
                  </div>
                </div>
                <button
                  onClick={() => dismiss(e.id)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: "#7a7060",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
