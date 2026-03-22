import { useState } from "react";
import { STATUS_MAP } from "../utils/status";
import { parseDollar, formatDollar } from "../utils/format";
import ReasonCodeBadges from "./ReasonCodeBadges";
import PatientWatch from "./PatientWatch";
import Alerts from "./Alerts";

function CollapsibleSection({ title, badge, badgeColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                background: (badgeColor || "#5a6478") + "20",
                color: badgeColor || "#5a6478",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ claims, payers, onNavigate, onViewClaims, workLogEntries = [] }) {
  const stats = {
    total: claims.length,
    totalBilled: claims.reduce((s, c) => s + parseDollar(c.billed), 0),
    totalPaid: claims.reduce(
      (s, c) => s + Math.max(0, parseDollar(c.prov_paid)),
      0
    ),
    deniedCount: claims.filter((c) => c._status === "denied").length,
    fwdCount: claims.filter((c) => c._status === "forwarded").length,
    paidCount: claims.filter((c) =>
      ["paid", "partial"].includes(c._status)
    ).length,
    prCount: claims.filter((c) => c._status === "pr_only").length,
    deniedAmt: claims
      .filter((c) => c._status === "denied")
      .reduce((s, c) => s + parseDollar(c.billed), 0),
  };

  if (stats.total === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>
          No claims loaded yet
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          Upload a CSV from your remittance data to get started
        </div>
        <button
          onClick={() => onNavigate("upload")}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          Go to Upload
        </button>
      </div>
    );
  }

  // Reason code frequency
  const codeCounts = {};
  claims.forEach((c) =>
    (c.reason_codes || "")
      .split(/[,;\s]+/)
      .filter(Boolean)
      .forEach((code) => {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      })
  );
  const topCodes = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          {
            l: "Total Billed",
            v: formatDollar(stats.totalBilled),
            s: `${stats.total} claims`,
            c: "var(--accent)",
          },
          {
            l: "Provider Paid",
            v: formatDollar(stats.totalPaid),
            s: `${stats.paidCount} paid/partial`,
            c: "var(--green)",
          },
          {
            l: "Denied",
            v: formatDollar(stats.deniedAmt),
            s: `${stats.deniedCount} claims`,
            c: "var(--red)",
          },
          {
            l: "Needs Follow-Up",
            v: `${stats.fwdCount + stats.prCount}`,
            s: `${stats.fwdCount} fwd, ${stats.prCount} pt resp`,
            c: "var(--purple)",
          },
        ].map((c) => (
          <div
            key={c.l}
            className="card"
            style={{ padding: 18, borderLeft: `3px solid ${c.c}` }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-muted)",
                marginBottom: 6,
              }}
            >
              {c.l}
            </div>
            <div
              className="mono"
              style={{ fontSize: 22, fontWeight: 700 }}
            >
              {c.v}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 3,
              }}
            >
              {c.s}
            </div>
          </div>
        ))}
      </div>

      {/* Status breakdown bar */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 10,
          }}
        >
          Status Breakdown
        </div>
        <div
          style={{
            display: "flex",
            borderRadius: 8,
            overflow: "hidden",
            height: 24,
          }}
        >
          {Object.entries(STATUS_MAP).map(([k, s]) => {
            const n = claims.filter((c) => c._status === k).length;
            return n ? (
              <div
                key={k}
                style={{
                  width: `${(n / stats.total) * 100}%`,
                  background: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  minWidth: 20,
                }}
              >
                {n}
              </div>
            ) : null;
          })}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            marginTop: 10,
          }}
        >
          {Object.entries(STATUS_MAP).map(([k, s]) => {
            const n = claims.filter((c) => c._status === k).length;
            return n ? (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: s.color,
                  }}
                />
                {s.label} ({n})
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Top reason codes */}
      {topCodes.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            Top Reason Codes
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topCodes.map(([code, count]) => (
              <div
                key={code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 6px 4px 2px",
                  borderRadius: 8,
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                }}
              >
                <ReasonCodeBadges codes={code} onViewClaims={onViewClaims} />
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  ×{count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-payer table */}
      {payers.length > 0 && (
        <div className="card" style={{ padding: 18 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            By Payer
          </div>
          <table>
            <thead>
              <tr>
                {["Payer", "Claims", "Billed", "Paid", "Denied"].map(
                  (h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i > 0 ? "right" : "left",
                        padding: "8px 12px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {payers.map((p) => {
                const pc = claims.filter((c) => c.payer === p);
                return (
                  <tr key={p} style={{ cursor: "default" }}>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{p}</td>
                    <td
                      className="mono"
                      style={{ textAlign: "right", fontSize: 12 }}
                    >
                      {pc.length}
                    </td>
                    <td
                      className="mono"
                      style={{ textAlign: "right", fontSize: 12 }}
                    >
                      {formatDollar(
                        pc.reduce((s, c) => s + parseDollar(c.billed), 0)
                      )}
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        color: "var(--green)",
                      }}
                    >
                      {formatDollar(
                        pc.reduce(
                          (s, c) =>
                            s + Math.max(0, parseDollar(c.prov_paid)),
                          0
                        )
                      )}
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        color: "var(--red)",
                      }}
                    >
                      {pc.filter((c) => c._status === "denied").length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Awaiting Response - collapsible */}
      {(() => {
        const awaiting = workLogEntries.filter(
          (e) => e.status === "pending" && ["email_payer", "awaiting_info"].includes(e.action)
        );
        const overdue = workLogEntries.filter(
          (e) => e.status === "pending" && e.followUpDate && new Date(e.followUpDate) < new Date()
          && !["email_payer", "awaiting_info"].includes(e.action)
        );
        const total = awaiting.length + overdue.length;
        if (total === 0) return null;
        return (
          <CollapsibleSection
            title="Awaiting Response"
            badge={`${total}`}
            badgeColor="#eab308"
          >
            <Alerts entries={workLogEntries} onNavigate={onNavigate} />
          </CollapsibleSection>
        );
      })()}

      {/* Patient Watch - collapsible */}
      {(() => {
        const problemStatuses = ["denied", "pr_only", "adjusted"];
        const problemCount = claims.filter((c) => problemStatuses.includes(c._status)).length;
        if (problemCount === 0) return null;
        return (
          <CollapsibleSection
            title="Patient Watch"
            badge="Recurring Denials"
            badgeColor="#ef4444"
          >
            <PatientWatch claims={claims} onViewPatient={onViewClaims} />
          </CollapsibleSection>
        );
      })()}
    </>
  );
}
