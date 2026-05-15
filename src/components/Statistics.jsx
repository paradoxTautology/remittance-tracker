import { useState, useMemo } from "react";
import { parseDollar, formatDollar } from "../utils/format";

// CPT → visit type labels
const CPT_LABELS = {
  "99201": "New Patient – Minimal",
  "99202": "New Patient – Low",
  "99203": "New Patient – Moderate",
  "99204": "New Patient – High",
  "99205": "New Patient – Comprehensive",
  "99211": "Established – Minimal",
  "99212": "Established – Low",
  "99213": "Routine Visit",
  "99214": "Extended Visit",
  "99215": "Comprehensive Visit",
  "99381": "New – Infant Physical",
  "99382": "New – Child Physical",
  "99383": "New – Adolescent Physical",
  "99384": "New – Adult Physical",
  "99385": "New – 40-64 Physical",
  "99386": "New – 65+ Physical",
  "99387": "New Patient Physical",
  "99391": "Est – Infant Physical",
  "99392": "Est – Child Physical",
  "99393": "Est – Adolescent Physical",
  "99394": "Est – Adult Physical",
  "99395": "Est – 40-64 Physical",
  "99396": "Est – 65+ Physical",
  "99397": "Est – 65+ Physical",
};

function isPhysical(cpt) {
  const code = (cpt || "").replace(/\(.*/, "").trim();
  const num = parseInt(code);
  return (num >= 99381 && num <= 99397);
}

// Parse DOS into Date object (handles MM/DD/YY and MM/DD/YYYY)
function parseDOS(dos) {
  if (!dos) return null;
  const parts = dos.split("/");
  if (parts.length !== 3) return null;
  let [m, d, y] = parts.map(Number);
  if (y < 100) y += 2000;
  return new Date(y, m - 1, d);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key) {
  const [y, m] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// Simple bar component
function Bar({ value, max, color, label, sublabel, amount }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
          {sublabel && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>{sublabel}</span>}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: amount ? "var(--blue)" : "var(--text-secondary)" }}>
          {amount || value}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--bg-input)" }}>
        <div style={{ height: "100%", borderRadius: 3, background: color || "var(--accent)", width: `${Math.max(pct, 1)}%`, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// KPI Card
function KPI({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: "16px 18px", flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: color || "var(--text-primary)", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// Date range presets
const RANGES = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  "ytd": "YTD",
  "all": "All Time",
};

export default function Statistics({ claims }) {
  const [range, setRange] = useState("all");

  // Filter claims by date range
  const filtered = useMemo(() => {
    if (range === "all") return claims;
    const now = new Date();
    let cutoff;
    if (range === "ytd") {
      cutoff = new Date(now.getFullYear(), 0, 1);
    } else {
      const days = parseInt(range);
      cutoff = new Date(now.getTime() - days * 86400000);
    }
    return claims.filter((c) => {
      const d = parseDOS(c.dos);
      return d && d >= cutoff;
    });
  }, [claims, range]);

  // --- KPIs ---
  const totalBilled = filtered.reduce((s, c) => s + parseDollar(c.billed), 0);
  const totalPaid = filtered.reduce((s, c) => s + Math.max(0, parseDollar(c.prov_paid)), 0);
  const totalDenied = filtered.filter((c) => c._status === "denied").length;
  const denialRate = filtered.length > 0 ? ((totalDenied / filtered.length) * 100).toFixed(1) : "0";
  const uniquePatients = new Set(filtered.map((c) => (c.patient || "").toLowerCase().replace(/[^a-z]/g, ""))).size;
  const avgPerVisit = filtered.length > 0 ? totalPaid / filtered.length : 0;

  // --- Visit type breakdown ---
  const visitTypes = {};
  filtered.forEach((c) => {
    const rawCpt = (c.cpt || "").replace(/\(.*/, "").trim();
    if (!rawCpt) return;
    const label = CPT_LABELS[rawCpt] || `CPT ${rawCpt}`;
    if (!visitTypes[label]) visitTypes[label] = { count: 0, billed: 0, paid: 0, cpt: rawCpt };
    visitTypes[label].count++;
    visitTypes[label].billed += parseDollar(c.billed);
    visitTypes[label].paid += Math.max(0, parseDollar(c.prov_paid));
  });
  const visitTypeArr = Object.entries(visitTypes).sort((a, b) => b[1].count - a[1].count);
  const maxVisitCount = Math.max(...visitTypeArr.map(([, v]) => v.count), 1);

  // --- Physicals vs Routine ---
  const physicalCount = filtered.filter((c) => isPhysical(c.cpt)).length;
  const routineCount = filtered.length - physicalCount;

  // --- Payer breakdown ---
  const payerStats = {};
  filtered.forEach((c) => {
    const p = c.payer || "Unknown";
    if (!payerStats[p]) payerStats[p] = { count: 0, billed: 0, paid: 0, denied: 0 };
    payerStats[p].count++;
    payerStats[p].billed += parseDollar(c.billed);
    payerStats[p].paid += Math.max(0, parseDollar(c.prov_paid));
    if (c._status === "denied") payerStats[p].denied++;
  });
  const payerArr = Object.entries(payerStats).sort((a, b) => b[1].count - a[1].count);
  const maxPayerCount = Math.max(...payerArr.map(([, v]) => v.count), 1);

  // --- Monthly trends ---
  const monthlyData = {};
  filtered.forEach((c) => {
    const d = parseDOS(c.dos);
    if (!d) return;
    const key = getMonthKey(d);
    if (!monthlyData[key]) monthlyData[key] = { visits: 0, billed: 0, paid: 0, denied: 0, patients: new Set() };
    monthlyData[key].visits++;
    monthlyData[key].billed += parseDollar(c.billed);
    monthlyData[key].paid += Math.max(0, parseDollar(c.prov_paid));
    if (c._status === "denied") monthlyData[key].denied++;
    monthlyData[key].patients.add((c.patient || "").toLowerCase().replace(/[^a-z]/g, ""));
  });
  const monthKeys = Object.keys(monthlyData).sort();
  const maxMonthVisits = Math.max(...monthKeys.map((k) => monthlyData[k].visits), 1);

  // --- Status breakdown ---
  const statusCounts = {};
  filtered.forEach((c) => {
    const s = c._status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const statusColors = {
    paid: "var(--green)", partial: "var(--yellow)", denied: "var(--red)",
    forwarded: "var(--purple)", pr_only: "var(--orange)", reversed: "var(--red)",
    adjusted: "var(--yellow)", unknown: "var(--gray)",
  };
  const statusLabels = {
    paid: "Paid", partial: "Partial", denied: "Denied",
    forwarded: "Forwarded", pr_only: "Patient Resp.", reversed: "Reversed",
    adjusted: "Adjusted", unknown: "Unknown",
  };
  const statusArr = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const maxStatusCount = Math.max(...statusArr.map(([, v]) => v), 1);

  if (claims.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>No data yet</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Import claims to see office statistics</div>
      </div>
    );
  }

  return (
    <div>
      {/* Date range selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(RANGES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            style={{
              padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: range === key ? "var(--accent)" : "var(--bg-card)",
              color: range === key ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI label="Patients Seen" value={uniquePatients} sub={`${filtered.length} total visits`} color="var(--yellow)" />
        <KPI label="Total Billed" value={formatDollar(totalBilled)} color="var(--blue)" />
        <KPI label="Total Paid" value={formatDollar(totalPaid)} sub={`${((totalPaid / (totalBilled || 1)) * 100).toFixed(0)}% collection rate`} color="var(--green)" />
        <KPI label="Denial Rate" value={`${denialRate}%`} sub={`${totalDenied} denied`} color={totalDenied > 0 ? "var(--red)" : "var(--green)"} />
        <KPI label="Avg Per Visit" value={formatDollar(avgPerVisit)} color="var(--accent)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Visit Type Breakdown */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
            Visit Types
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: "var(--accent)" }}>
              {physicalCount} physical{physicalCount !== 1 ? "s" : ""} · {routineCount} routine
            </span>
          </div>
          {visitTypeArr.map(([label, data]) => (
            <Bar
              key={label}
              label={label}
              sublabel={`CPT ${data.cpt}`}
              value={data.count}
              max={maxVisitCount}
              color={isPhysical(data.cpt) ? "var(--purple)" : "var(--accent)"}
              amount={formatDollar(data.paid)}
            />
          ))}
          {visitTypeArr.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 16, textAlign: "center" }}>No CPT data available</div>
          )}
        </div>

        {/* Monthly Trends */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Monthly Trends</div>
          {monthKeys.map((key) => {
            const d = monthlyData[key];
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{getMonthLabel(key)}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {d.patients.size} patients · {d.visits} visits
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--bg-input)" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: "var(--green)", width: `${(d.visits / maxMonthVisits) * 100}%`, transition: "width 0.4s ease" }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--blue)", minWidth: 70, textAlign: "right" }}>{formatDollar(d.paid)}</span>
                </div>
                {d.denied > 0 && (
                  <div style={{ fontSize: 10, color: "var(--red)", marginTop: 2 }}>{d.denied} denied</div>
                )}
              </div>
            );
          })}
          {monthKeys.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 16, textAlign: "center" }}>No date data available</div>
          )}
        </div>

        {/* Payer Breakdown */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>By Payer</div>
          {payerArr.map(([payer, data]) => (
            <Bar
              key={payer}
              label={payer}
              sublabel={`${data.count} claims`}
              value={data.count}
              max={maxPayerCount}
              color="var(--yellow)"
              amount={formatDollar(data.paid)}
            />
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Claim Outcomes</div>
          {statusArr.map(([status, count]) => (
            <Bar
              key={status}
              label={statusLabels[status] || status}
              value={count}
              max={maxStatusCount}
              color={statusColors[status] || "var(--gray)"}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
