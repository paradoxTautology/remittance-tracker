import { useState } from "react";
import { STATUS_MAP } from "../utils/status";
import { parseDollar, formatDollar } from "../utils/format";
import ReasonCodeBadges from "./ReasonCodeBadges";
import PatientWatch from "./PatientWatch";
import Alerts from "./Alerts";
import TodoPanel from "./TodoPanel";

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
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: (badgeColor || "#7a7060") + "20", color: badgeColor || "#7a7060" }}>{badge}</span>
          )}
        </div>
        <span style={{ fontSize: 14, color: "var(--text-muted)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 18px 16px" }}>{children}</div>}
    </div>
  );
}

export default function Dashboard({ claims, payers, onNavigate, onViewClaims, workLogEntries = [], todos = [], onAddTodo, onToggleTodo, onRemoveTodo, onClearDoneTodos, onUpdateTodo, view }) {
  const [showAllCodes, setShowAllCodes] = useState(false);
  const isRemittance = view === "remittance";

  const stats = {
    total: claims.length,
    totalBilled: claims.reduce((s, c) => s + parseDollar(c.billed), 0),
    totalPaid: claims.reduce((s, c) => s + Math.max(0, parseDollar(c.prov_paid)), 0),
    deniedCount: claims.filter((c) => c._status === "denied").length,
    fwdCount: claims.filter((c) => c._status === "forwarded").length,
    paidCount: claims.filter((c) => ["paid", "partial"].includes(c._status)).length,
    prCount: claims.filter((c) => c._status === "pr_only").length,
    deniedAmt: claims.filter((c) => c._status === "denied").reduce((s, c) => s + parseDollar(c.billed), 0),
  };

  if (stats.total === 0 && !isRemittance) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>No claims loaded yet</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Upload a CSV from your remittance data to get started</div>
        <button onClick={() => onNavigate("upload")} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>Go to Upload</button>
      </div>
    );
  }

  // Reason code frequency
  const codeCounts = {};
  claims.forEach((c) =>
    (c.reason_codes || "").split(/[,;\s]+/).filter(Boolean).forEach((code) => {
      codeCounts[code] = (codeCounts[code] || 0) + 1;
    })
  );
  const allCodes = Object.entries(codeCounts).sort((a, b) => b[1] - a[1]);
  const displayCodes = showAllCodes ? allCodes : allCodes.slice(0, 10);

  // ==================== REMITTANCE VIEW ====================
  if (isRemittance) {
    return (
      <>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { l: "Total Billed", v: formatDollar(stats.totalBilled), s: `${stats.total} claims`, c: "var(--accent)" },
            { l: "Provider Paid", v: formatDollar(stats.totalPaid), s: `${stats.paidCount} paid/partial`, c: "var(--green)" },
            { l: "Denied", v: formatDollar(stats.deniedAmt), s: `${stats.deniedCount} claims`, c: "var(--red)" },
            { l: "Needs Follow-Up", v: `${stats.fwdCount + stats.prCount}`, s: `${stats.fwdCount} fwd, ${stats.prCount} pt resp`, c: "var(--purple)" },
          ].map((c) => (
            <div key={c.l} className="card" style={{ padding: 18, borderLeft: `3px solid ${c.c}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 6 }}>{c.l}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{c.v}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>{c.s}</div>
            </div>
          ))}
        </div>

        {/* Status breakdown bar */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Status Breakdown</div>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 24 }}>
            {Object.entries(STATUS_MAP).map(([k, s]) => {
              const n = claims.filter((c) => c._status === k).length;
              return n ? (
                <div key={k} style={{ width: `${(n / stats.total) * 100}%`, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", minWidth: 20 }}>{n}</div>
              ) : null;
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
            {Object.entries(STATUS_MAP).map(([k, s]) => {
              const n = claims.filter((c) => c._status === k).length;
              return n ? (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                  {s.label} ({n})
                </div>
              ) : null;
            })}
          </div>
        </div>


        {/* Recently Updated */}
        {(() => {
          const updated = claims.filter((c) => c._updated).sort((a, b) => new Date(b._updated) - new Date(a._updated));
          if (updated.length === 0) return null;
          return (
            <CollapsibleSection title="Recently Updated" badge={`${updated.length}`} badgeColor="var(--blue)" defaultOpen={true}>
              <table>
                <thead>
                  <tr>
                    {["Patient", "Payer", "DOS", "Previous", "Current", "Updated"].map((h, i) => (
                      <th key={h} style={{ textAlign: i > 2 ? "right" : "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {updated.slice(0, 25).map((c) => (
                    <tr key={c._id} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 500 }}>{c.patient}</td>
                      <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-secondary)" }}>{c.payer}</td>
                      <td className="mono" style={{ padding: "8px 12px", fontSize: 11 }}>{c.dos}</td>
                      <td className="mono" style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", color: "var(--red)", textDecoration: "line-through" }}>{formatDollar(c._prevPaid || 0)}</td>
                      <td className="mono" style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", color: "var(--green)", fontWeight: 700 }}>{formatDollar(parseDollar(c.prov_paid))}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, textAlign: "right", color: "var(--text-muted)" }}>{new Date(c._updated).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleSection>
          );
        })()}

        {/* Reason codes */}
        {allCodes.length > 0 && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Reason Codes {showAllCodes ? `(All ${allCodes.length})` : `(Top 10 of ${allCodes.length})`}
              </div>
              {allCodes.length > 10 && (
                <button onClick={() => setShowAllCodes(!showAllCodes)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 600, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
                  {showAllCodes ? "Show Top 10" : "Show All"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {displayCodes.map(([code, count]) => (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px 4px 2px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <ReasonCodeBadges codes={code} onViewClaims={onViewClaims} />
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payer table */}
        {payers.length > 0 && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>By Payer</div>
            <table>
              <thead>
                <tr>
                  {["Payer", "Claims", "Billed", "Paid", "Denied"].map((h, i) => (
                    <th key={h} style={{ textAlign: i > 0 ? "right" : "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: i === 1 ? "#d4a843" : i === 2 ? "#6ca6d6" : "var(--text-muted)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payers.map((p, rowIdx) => {
                  const pc = claims.filter((c) => c.payer === p);
                  return (
                    <tr key={p} onClick={() => onViewClaims(p)} style={{ background: rowIdx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={(e) => e.currentTarget.style.background = rowIdx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"}>
                      <td style={{ fontWeight: 500, fontSize: 12 }}>{p}</td>
                      <td className="mono" style={{ textAlign: "right", fontSize: 12, color: "#d4a843" }}>{pc.length}</td>
                      <td className="mono" style={{ textAlign: "right", fontSize: 12, color: "#6ca6d6" }}>{formatDollar(pc.reduce((s, c) => s + parseDollar(c.billed), 0))}</td>
                      <td className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--green)" }}>{formatDollar(pc.reduce((s, c) => s + Math.max(0, parseDollar(c.prov_paid)), 0))}</td>
                      <td className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--red)" }}>{pc.filter((c) => c._status === "denied").length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Awaiting Response */}
        {(() => {
          const awaiting = workLogEntries.filter((e) => e.status === "pending" && ["email_payer", "awaiting_info"].includes(e.action));
          const overdue = workLogEntries.filter((e) => e.status === "pending" && e.followUpDate && new Date(e.followUpDate) < new Date() && !["email_payer", "awaiting_info"].includes(e.action));
          const total = awaiting.length + overdue.length;
          if (total === 0) return null;
          return (
            <CollapsibleSection title="Awaiting Response" badge={`${total}`} badgeColor="#c8aa64">
              <Alerts entries={workLogEntries} onNavigate={onNavigate} />
            </CollapsibleSection>
          );
        })()}

        {/* Patient Watch */}
        {(() => {
          const problemStatuses = ["denied", "pr_only", "adjusted"];
          const problemCount = claims.filter((c) => problemStatuses.includes(c._status)).length;
          if (problemCount === 0) return null;
          return (
            <CollapsibleSection title="Patient Watch" badge="Recurring Denials" badgeColor="#c0785a">
              <PatientWatch claims={claims} onViewPatient={onViewClaims} />
            </CollapsibleSection>
          );
        })()}
      </>
    );
  }


  // ==================== DASHBOARD VIEW (home) ====================
  const openTodos = todos.filter((t) => !t.done).length;
  const overdueTodos = todos.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString())).length;
  const CATS = [
    { key: "billing", label: "Billing", color: "#6ca6d6" },
    { key: "front_desk", label: "Front Desk", color: "#d4a843" },
    { key: "supervision", label: "Supervision", color: "#b07cc8" },
    { key: "admin", label: "Admin", color: "#c2703e" },
  ];

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // This week snapshot
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekClaims = claims.filter((c) => c._imported && new Date(c._imported) > weekAgo);
  const thisWeekDenied = thisWeekClaims.filter((c) => c._status === "denied").length;
  const thisWeekPaid = thisWeekClaims.reduce((s, c) => s + Math.max(0, parseDollar(c.prov_paid)), 0);
  const thisWeekResolved = workLogEntries.filter((e) => e.status === "resolved" && e.resolvedDate && new Date(e.resolvedDate) > weekAgo).length;

  // Denial rate trend (this month vs last month)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthClaims = claims.filter((c) => c._imported && new Date(c._imported) >= thisMonthStart);
  const lastMonthClaims = claims.filter((c) => c._imported && new Date(c._imported) >= lastMonthStart && new Date(c._imported) < thisMonthStart);
  const thisMonthDenialRate = thisMonthClaims.length > 0 ? Math.round((thisMonthClaims.filter((c) => c._status === "denied").length / thisMonthClaims.length) * 100) : 0;
  const lastMonthDenialRate = lastMonthClaims.length > 0 ? Math.round((lastMonthClaims.filter((c) => c._status === "denied").length / lastMonthClaims.length) * 100) : 0;
  const denialTrend = thisMonthDenialRate - lastMonthDenialRate;

  // Upcoming deadlines — tasks + work log follow-ups
  const upcomingTasks = todos.filter((t) => !t.done && t.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const upcomingFollowUps = workLogEntries.filter((e) => e.status === "pending" && e.followUpDate).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)).slice(0, 5);

  // Recent activity — combine work log, imports, tasks
  const recentActivities = [
    ...workLogEntries.slice(-10).map((e) => ({
      text: `${e.action === "appeal" ? "Appealed" : e.action === "resubmit" ? "Resubmitted" : e.action === "email_payer" ? "Emailed payer for" : e.action === "paid_resolved" ? "Resolved" : "Worked"} ${e.patient}`,
      date: e.workedDate,
      color: e.action === "paid_resolved" ? "var(--green)" : e.action === "appeal" ? "#e8963a" : "var(--accent)",
    })),
    ...todos.filter((t) => t.done && t.doneDate).slice(-5).map((t) => ({
      text: `Completed: ${t.text}`,
      date: t.doneDate,
      color: "var(--green)",
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <>
      {/* Greeting bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{greeting}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{today}</div>
      </div>

      {/* Quick action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Upload Remittance", action: () => { onNavigate("remittance"); setTimeout(() => document.querySelector('[class*="tab"]')?.click(), 100); }, color: "var(--accent)", nav: "upload" },
          { label: "Add Task", action: () => onNavigate("tasks"), color: "#d4a843" },
          { label: "View Denied", action: () => onViewClaims("denied"), color: "var(--red)" },
        ].map((b) => (
          <button
            key={b.label}
            onClick={b.nav ? () => { onNavigate("remittance"); } : b.action}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 8,
              border: `1px solid ${b.color}40`, background: `${b.color}10`,
              color: b.color, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.background = `${b.color}20`}
            onMouseLeave={(e) => e.target.style.background = `${b.color}10`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* This week snapshot */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>This Week</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{thisWeekClaims.length}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>claims imported</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{formatDollar(thisWeekPaid)}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>paid</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--red)" }}>{thisWeekDenied}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>denied</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{thisWeekResolved}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>resolved</div>
          </div>
        </div>
        {/* Denial rate trend */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Denial rate:</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: thisMonthDenialRate > 20 ? "var(--red)" : "var(--text-primary)" }}>{thisMonthDenialRate}%</span>
          {lastMonthClaims.length > 0 && (
            <span style={{ fontSize: 11, color: denialTrend < 0 ? "var(--green)" : denialTrend > 0 ? "var(--red)" : "var(--text-muted)" }}>
              {denialTrend < 0 ? "\u2193" : denialTrend > 0 ? "\u2191" : "\u2192"} {Math.abs(denialTrend)}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* Remittance Tracker summary */}
      <div className="card" style={{ padding: 18, marginBottom: 16, cursor: "pointer" }} onClick={() => onNavigate("remittance")}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Remittance Tracker</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { l: "Total Billed", v: formatDollar(stats.totalBilled), s: `${stats.total} claims`, c: "var(--accent)" },
            { l: "Provider Paid", v: formatDollar(stats.totalPaid), s: `${stats.paidCount} paid/partial`, c: "var(--green)" },
            { l: "Denied", v: formatDollar(stats.deniedAmt), s: `${stats.deniedCount} claims`, c: "var(--red)" },
            { l: "Needs Follow-Up", v: `${stats.fwdCount + stats.prCount}`, s: `${stats.fwdCount} fwd, ${stats.prCount} pt resp`, c: "var(--purple)" },
          ].map((c) => (
            <div key={c.l} style={{ padding: 14, borderLeft: `3px solid ${c.c}`, background: "var(--bg-input)", borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 6 }}>{c.l}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{c.v}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>{c.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two column: Upcoming Deadlines + Tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Upcoming deadlines */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Upcoming Deadlines</div>
          {upcomingTasks.length === 0 && upcomingFollowUps.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No upcoming deadlines</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingTasks.map((t) => {
                const isOverdue = new Date(t.dueDate) < new Date(new Date().toDateString());
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOverdue ? "var(--red)" : "#d4a843", flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                    <span style={{ fontSize: 10, color: isOverdue ? "var(--red)" : "var(--text-muted)", whiteSpace: "nowrap", fontWeight: isOverdue ? 600 : 400 }}>
                      {new Date(t.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
              {upcomingFollowUps.map((e) => {
                const isOverdue = new Date(e.followUpDate) < new Date(new Date().toDateString());
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOverdue ? "var(--red)" : "var(--purple)", flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Follow up: {e.patient}</span>
                    <span style={{ fontSize: 10, color: isOverdue ? "var(--red)" : "var(--text-muted)", whiteSpace: "nowrap", fontWeight: isOverdue ? 600 : 400 }}>
                      {new Date(e.followUpDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks summary */}
        <div className="card" style={{ padding: 18, cursor: "pointer" }} onClick={() => onNavigate("tasks")}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: openTodos > 0 ? 10 : 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tasks</span>
            {openTodos > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: overdueTodos > 0 ? "rgba(212,96,74,0.15)" : "rgba(212,168,56,0.15)", color: overdueTodos > 0 ? "var(--red)" : "#d4a838" }}>
                {openTodos} open{overdueTodos > 0 ? ` \u00b7 ${overdueTodos} overdue` : ""}
              </span>
            )}
          </div>
          {openTodos === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>All caught up</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {todos.filter((t) => !t.done).slice(0, 5).map((t) => {
                const cat = CATS.find((c) => c.key === t.category) || { label: "Other", color: "#8a8078" };
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString());
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                    {t.dueDate && <span style={{ fontSize: 10, color: isOverdue ? "var(--red)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{new Date(t.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                );
              })}
              {openTodos > 5 && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>+{openTodos - 5} more</div>}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {recentActivities.length > 0 && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentActivities.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: "var(--text-primary)" }}>{a.text}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
