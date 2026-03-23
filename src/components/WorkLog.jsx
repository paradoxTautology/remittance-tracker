import { useState } from "react";
import { formatDollar } from "../utils/format";
import ReasonCodeBadges from "./ReasonCodeBadges";

const ACTION_CONFIG = {
  resubmit: { label: "Resubmitted", color: "#4db8a0", icon: "⟳" },
  appeal: { label: "Appealed", color: "#e8963a", icon: "⟳" },
  email_payer: { label: "Emailed Payer", color: "#d4a838", icon: "✉" },
  awaiting_info: { label: "Awaiting Info", color: "#d4a838", icon: "⏳" },
  contact_payer: { label: "Contacted Payer", color: "#b07cc8", icon: "✆" },
  bill_patient: { label: "Billed Patient", color: "#c87c5a", icon: "$" },
  submit_secondary: { label: "Sent to Secondary", color: "#5b9bd5", icon: "→" },
  write_off: { label: "Written Off", color: "#8a8078", icon: "—" },
  other: { label: "Other", color: "#c2703e", icon: "✎" },
};

// Group order — most actionable first
const GROUP_ORDER = [
  "resubmit",
  "appeal",
  "email_payer",
  "awaiting_info",
  "contact_payer",
  "submit_secondary",
  "bill_patient",
  "write_off",
  "other",
];

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#d4a838", icon: "⏳" },
  resolved: { label: "Resolved", color: "#6db856", icon: "✓" },
  written_off: { label: "Written Off", color: "#8a8078", icon: "—" },
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

function ActionGroup({ action, entries, onUpdateEntry, onRemoveEntry, onViewClaims, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const config = ACTION_CONFIG[action] || ACTION_CONFIG.other;
  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const resolvedCount = entries.filter((e) => e.status === "resolved").length;
  const totalBilled = entries
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + (parseFloat(e.billed) || 0), 0);

  return (
    <div
      style={{
        background: "#221f1b",
        borderRadius: 14,
        border: "1px solid #342f28",
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {/* Header — clickable */}
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
          <span style={{ fontSize: 16 }}>{config.icon}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: config.color,
            }}
          >
            {config.label}
          </span>
          {pendingCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                background: config.color + "20",
                color: config.color,
              }}
            >
              {pendingCount} pending
            </span>
          )}
          {resolvedCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                background: "#6db85620",
                color: "#6db856",
              }}
            >
              {resolvedCount} resolved
            </span>
          )}
          {pendingCount > 0 && (
            <span style={{ fontSize: 11, color: "#7a7060" }}>
              · {formatDollar(totalBilled)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#7a7060" }}>
            {entries.length} total
          </span>
          <span
            style={{
              fontSize: 14,
              color: "#7a7060",
              transition: "transform 0.2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Entries */}
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ display: "grid", gap: 8 }}>
            {entries
              .sort((a, b) => {
                if (a.status === "pending" && b.status !== "pending") return -1;
                if (b.status === "pending" && a.status !== "pending") return 1;
                return new Date(b.workedDate) - new Date(a.workedDate);
              })
              .map((entry) => {
                const st = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
                const days = daysAgo(entry.workedDate);
                const isOverdue =
                  entry.status === "pending" &&
                  entry.followUpDate &&
                  new Date(entry.followUpDate) < new Date();

                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: "12px 14px",
                      background: "#2a2620",
                      borderRadius: 10,
                      borderLeft: `3px solid ${st.color}`,
                      opacity: entry.status === "written_off" ? 0.6 : 1,
                    }}
                  >
                    {/* Top row: name + status + actions */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#e8dfd0" }}>
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
                                background: "rgba(212,96,74,0.15)",
                                color: "#d4604a",
                              }}
                            >
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#bfb5a3" }}>
                          <span>{entry.dos}</span>
                          {entry.cpt && <span className="mono">{entry.cpt}</span>}
                          <span>{entry.payer}</span>
                          <span className="mono">{formatDollar(parseFloat(entry.billed) || 0)}</span>
                          <span style={{ color: "#7a7060" }}>
                            {formatDate(entry.workedDate)}
                            {days !== null && ` (${days}d ago)`}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {entry.status === "pending" && (
                          <button
                            onClick={() =>
                              onUpdateEntry(entry.id, {
                                status: "resolved",
                                resolvedDate: new Date().toISOString(),
                              })
                            }
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "1px solid rgba(109,184,86,0.3)",
                              background: "rgba(109,184,86,0.1)",
                              color: "#6db856",
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 600,
                              fontFamily: "inherit",
                            }}
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveEntry(entry.id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid rgba(212,96,74,0.2)",
                            background: "transparent",
                            color: "#7a7060",
                            cursor: "pointer",
                            fontSize: 10,
                            fontFamily: "inherit",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Reason codes */}
                    {entry.reason_codes && (
                      <div style={{ marginBottom: entry.notes ? 4 : 0 }}>
                        <ReasonCodeBadges codes={entry.reason_codes} onViewClaims={onViewClaims} />
                      </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#bfb5a3",
                          marginTop: 4,
                          lineHeight: 1.5,
                          padding: "6px 10px",
                          background: "#221f1b",
                          borderRadius: 6,
                          borderLeft: "2px solid #342f28",
                        }}
                      >
                        {entry.notes}
                      </div>
                    )}

                    {/* Follow-up */}
                    {entry.followUpDate && entry.status === "pending" && (
                      <div
                        style={{
                          fontSize: 10,
                          color: isOverdue ? "#d4604a" : "#7a7060",
                          marginTop: 4,
                        }}
                      >
                        Follow-up: {formatDate(entry.followUpDate)}
                      </div>
                    )}

                    {/* Resolved amount */}
                    {entry.status === "resolved" && entry.resolvedPaid > 0 && (
                      <div style={{ fontSize: 11, color: "#6db856", marginTop: 4, fontWeight: 600 }}>
                        Paid {formatDollar(entry.resolvedPaid)} on {formatDate(entry.resolvedDate)}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkLog({ entries, onUpdateEntry, onRemoveEntry, onClear, onViewClaims }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = entries.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return [e.patient, e.reason_codes, e.payer, e.action, e.notes].some((v) =>
        (v || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Group by action
  const groups = {};
  filtered.forEach((e) => {
    const key = e.action || "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
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
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e8dfd0", marginBottom: 5 }}>
          No worked claims yet
        </div>
        <div style={{ fontSize: 12, color: "#7a7060" }}>
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
          { l: "Pending", v: stats.pending, s: formatDollar(stats.pendingAmt) + " at stake", c: "#d4a838" },
          { l: "Resolved", v: stats.resolved, s: formatDollar(stats.resolvedAmt) + " recovered", c: "#6db856" },
          { l: "Written Off", v: stats.writtenOff, s: "no further action", c: "#8a8078" },
          { l: "Overdue", v: stats.overdue, s: "need attention", c: stats.overdue > 0 ? "#d4604a" : "#7a7060" },
        ].map((c) => (
          <div key={c.l} className="card" style={{ padding: 16, borderLeft: `3px solid ${c.c}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#7a7060", marginBottom: 4 }}>{c.l}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#e8dfd0" }}>{c.v}</div>
            <div style={{ fontSize: 11, color: "#bfb5a3", marginTop: 2 }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Search patient, payer, notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: "1px solid #342f28",
            background: "#2a2620",
            color: "#e8dfd0",
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
              className={`fb ${statusFilter === v ? "fb-on" : ""}`}
              onClick={() => setStatusFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#7a7060" }}>
          {filtered.length} entries
        </span>
      </div>

      {/* Grouped sections */}
      {GROUP_ORDER.filter((action) => groups[action] && groups[action].length > 0).map(
        (action, i) => (
          <ActionGroup
            key={action}
            action={action}
            entries={groups[action]}
            onUpdateEntry={onUpdateEntry}
            onRemoveEntry={onRemoveEntry}
            onViewClaims={onViewClaims}
            defaultOpen={i === 0}
          />
        )
      )}

      {/* Clear */}
      {entries.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            onClick={() => {
              if (confirm("Clear entire work log? This cannot be undone.")) onClear();
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid rgba(212,96,74,0.2)",
              background: "rgba(212,96,74,0.07)",
              color: "#d4604a",
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
