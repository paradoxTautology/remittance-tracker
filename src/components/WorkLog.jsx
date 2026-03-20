import { useState } from "react";
import { formatDollar } from "../utils/format";
import ReasonCodeBadges from "./ReasonCodeBadges";

const ACTION_LABELS = {
  appeal: "Appeal",
  resubmit: "Resubmit",
  email_payer: "Email Payer",
  awaiting_info: "Awaiting Info",
  bill_patient: "Bill Patient",
  contact_payer: "Contact Payer",
  submit_secondary: "Submit Secondary",
  write_off: "Write Off",
  other: "Other",
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#f59e0b", icon: "⏳" },
  resolved: { label: "Resolved", color: "#22c55e", icon: "✓" },
  written_off: { label: "Written Off", color: "#6b7280", icon: "—" },
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysAgo(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

export default function WorkLog({ entries, onUpdateEntry, onRemoveEntry, onClear, onViewClaims }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = entries
    .filter((e) => {
      if (filter !== "all" && e.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return [e.patient, e.reason_codes, e.payer, e.action, e.notes]
          .some((v) => (v || "").toLowerCase().includes(s));
      }
      return true;
    })
    .sort((a, b) => {
      // Pending first, then by worked date desc
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.workedDate) - new Date(a.workedDate);
    });

  const stats = {
    total: entries.length,
    pending: entries.filter((e) => e.status === "pending").length,
    resolved: entries.filter((e) => e.status === "resolved").length,
    writtenOff: entries.filter((e) => e.status === "written_off").length,
    resolvedAmt: entries
      .filter((e) => e.status === "resolved")
      .reduce((s, e) => s + (e.resolvedPaid || 0), 0),
    pendingAmt: entries
      .filter((e) => e.status === "pending")
      .reduce((s, e) => s + (parseFloat(e.billed) || 0), 0),
    overdue: entries.filter((e) => {
      if (e.status !== "pending" || !e.followUpDate) return false;
      return new Date(e.followUpDate) < new Date();
    }).length,
  };

  if (entries.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e8eaf0", marginBottom: 5 }}>
          No worked claims yet
        </div>
        <div style={{ fontSize: 12, color: "#5a6478" }}>
          Go to Claims, click a claim, and hit "Work Claim" to start tracking denials
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { l: "Pending", v: stats.pending, s: formatDollar(stats.pendingAmt) + " at stake", c: "#f59e0b" },
          { l: "Resolved", v: stats.resolved, s: formatDollar(stats.resolvedAmt) + " recovered", c: "#22c55e" },
          { l: "Written Off", v: stats.writtenOff, s: "no further action", c: "#6b7280" },
          { l: "Overdue Follow-Ups", v: stats.overdue, s: "need attention", c: stats.overdue > 0 ? "#ef4444" : "#5a6478" },
        ].map((c) => (
          <div key={c.l} className="card" style={{ padding: 16, borderLeft: `3px solid ${c.c}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#5a6478", marginBottom: 4 }}>{c.l}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#e8eaf0" }}>{c.v}</div>
            <div style={{ fontSize: 11, color: "#8b95a8", marginTop: 2 }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          placeholder="Search patient, payer, notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: "1px solid #252d3d",
            background: "#1c2130",
            color: "#e8eaf0",
            fontSize: 12,
            width: 260,
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["all", "All"],
            ["pending", "Pending"],
            ["resolved", "Resolved"],
            ["written_off", "Written Off"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`fb ${filter === v ? "fb-on" : ""}`}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#5a6478" }}>
          {filtered.length} entries
        </span>
      </div>

      {/* Entries */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((entry) => {
          const st = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
          const days = daysAgo(entry.workedDate);
          const isOverdue =
            entry.status === "pending" &&
            entry.followUpDate &&
            new Date(entry.followUpDate) < new Date();

          return (
            <div
              key={entry.id}
              className="card"
              style={{
                padding: 16,
                borderLeft: `3px solid ${st.color}`,
                opacity: entry.status === "written_off" ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>
                      {entry.patient}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: st.color + "20",
                        color: st.color,
                      }}
                    >
                      {st.icon} {st.label}
                    </span>
                    {isOverdue && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: "rgba(239,68,68,0.15)",
                          color: "#ef4444",
                        }}
                      >
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#8b95a8" }}>
                    <span>{entry.dos}</span>
                    {entry.cpt && <span className="mono">{entry.cpt}</span>}
                    <span>{entry.payer}</span>
                    <span className="mono">{formatDollar(parseFloat(entry.billed) || 0)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {entry.status === "pending" && (
                    <button
                      onClick={() => onUpdateEntry(entry.id, { status: "resolved", resolvedDate: new Date().toISOString() })}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(34,197,94,0.3)",
                        background: "rgba(34,197,94,0.1)",
                        color: "#22c55e",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveEntry(entry.id)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(239,68,68,0.2)",
                      background: "transparent",
                      color: "#5a6478",
                      cursor: "pointer",
                      fontSize: 10,
                      fontFamily: "inherit",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Action + details */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: entry.notes ? 6 : 0 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "#1c2130",
                    border: "1px solid #252d3d",
                    color: "#8b95a8",
                    textTransform: "uppercase",
                  }}
                >
                  {ACTION_LABELS[entry.action] || entry.action}
                </span>
                <ReasonCodeBadges codes={entry.reason_codes} onViewClaims={onViewClaims} />
                <span style={{ fontSize: 10, color: "#5a6478", marginLeft: "auto" }}>
                  Worked {formatDate(entry.workedDate)}
                  {days !== null && ` (${days}d ago)`}
                </span>
              </div>

              {entry.notes && (
                <div style={{ fontSize: 11, color: "#8b95a8", marginTop: 4, lineHeight: 1.5, paddingLeft: 2 }}>
                  {entry.notes}
                </div>
              )}

              {entry.followUpDate && entry.status === "pending" && (
                <div style={{ fontSize: 10, color: isOverdue ? "#ef4444" : "#5a6478", marginTop: 4 }}>
                  Follow-up: {formatDate(entry.followUpDate)}
                </div>
              )}

              {entry.status === "resolved" && entry.resolvedPaid > 0 && (
                <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4, fontWeight: 600 }}>
                  Paid {formatDollar(entry.resolvedPaid)} on {formatDate(entry.resolvedDate)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Clear */}
      {entries.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button
            onClick={() => {
              if (confirm("Clear entire work log? This cannot be undone.")) onClear();
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.07)",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Clear Work Log
          </button>
        </div>
      )}
    </>
  );
}
