import { useState } from "react";
import { formatDollar } from "../utils/format";

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z]/g, "");
}

export default function PatientWatch({ claims, onViewPatient }) {
  const [minClaims, setMinClaims] = useState(2);
  const [sortBy, setSortBy] = useState("count"); // "count", "amount", "name"

  // Group denied/unpaid claims by patient
  const problemStatuses = ["denied", "pr_only", "adjusted"];
  const problemClaims = claims.filter((c) => problemStatuses.includes(c._status));

  const patientMap = {};
  problemClaims.forEach((c) => {
    const key = normalize(c.patient);
    if (!key) return;
    if (!patientMap[key]) {
      patientMap[key] = {
        name: c.patient,
        claims: [],
        totalBilled: 0,
        payers: new Set(),
        reasonCodes: {},
        dateRange: { earliest: c.dos, latest: c.dos },
      };
    }
    const p = patientMap[key];
    p.claims.push(c);
    p.totalBilled += parseFloat(c.billed) || 0;
    if (c.payer) p.payers.add(c.payer);
    (c.reason_codes || "").split(/[\s,;]+/).filter(Boolean).forEach((code) => {
      p.reasonCodes[code] = (p.reasonCodes[code] || 0) + 1;
    });
    if (c.dos && (!p.dateRange.earliest || c.dos < p.dateRange.earliest)) {
      p.dateRange.earliest = c.dos;
    }
    if (c.dos && (!p.dateRange.latest || c.dos > p.dateRange.latest)) {
      p.dateRange.latest = c.dos;
    }
  });

  const patients = Object.values(patientMap)
    .filter((p) => p.claims.length >= minClaims)
    .sort((a, b) => {
      if (sortBy === "count") return b.claims.length - a.claims.length;
      if (sortBy === "amount") return b.totalBilled - a.totalBilled;
      return a.name.localeCompare(b.name);
    });

  const totalAtRisk = patients.reduce((s, p) => s + p.totalBilled, 0);

  if (problemClaims.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 11, color: "#5a6478" }}>
          {patients.length} patient{patients.length !== 1 ? "s" : ""} with
          recurring denials · {formatDollar(totalAtRisk)} at risk
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select
            value={minClaims}
            onChange={(e) => setMinClaims(Number(e.target.value))}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #252d3d",
              background: "#1c2130",
              color: "#8b95a8",
              fontSize: 11,
              fontFamily: "inherit",
            }}
          >
            <option value={2}>2+ claims</option>
            <option value={3}>3+ claims</option>
            <option value={5}>5+ claims</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #252d3d",
              background: "#1c2130",
              color: "#8b95a8",
              fontSize: 11,
              fontFamily: "inherit",
            }}
          >
            <option value="count">Most claims</option>
            <option value="amount">Highest amount</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {patients.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#5a6478" }}>
          No patients with {minClaims}+ denied claims
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {patients.slice(0, 20).map((p) => {
            const topCode = Object.entries(p.reasonCodes)
              .sort((a, b) => b[1] - a[1])[0];

            return (
              <div
                key={p.name}
                onClick={() => onViewPatient(p.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#1c2130",
                  borderRadius: 8,
                  borderLeft: `3px solid ${p.claims.length >= 5 ? "#ef4444" : p.claims.length >= 3 ? "#f59e0b" : "#5a6478"}`,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#252d3d"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1c2130"; }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: p.claims.length >= 5
                          ? "rgba(239,68,68,0.15)"
                          : p.claims.length >= 3
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(90,100,120,0.15)",
                        color: p.claims.length >= 5
                          ? "#ef4444"
                          : p.claims.length >= 3
                          ? "#f59e0b"
                          : "#5a6478",
                      }}
                    >
                      {p.claims.length} denied
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#5a6478", marginTop: 4 }}>
                    <span className="mono" style={{ color: "#ef4444" }}>
                      {formatDollar(p.totalBilled)}
                    </span>
                    <span>{[...p.payers].join(", ")}</span>
                    {topCode && (
                      <span>
                        Top: <span className="mono" style={{ color: "#f59e0b" }}>{topCode[0]}</span> ×{topCode[1]}
                      </span>
                    )}
                    <span>{p.dateRange.earliest} — {p.dateRange.latest}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600 }}>
                  View →
                </span>
              </div>
            );
          })}
          {patients.length > 20 && (
            <div style={{ textAlign: "center", fontSize: 11, color: "#5a6478", padding: 8 }}>
              Showing top 20 of {patients.length} patients
            </div>
          )}
        </div>
      )}
    </div>
  );
}
