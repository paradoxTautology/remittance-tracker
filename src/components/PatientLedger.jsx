import { useState } from "react";
import { formatDollar } from "../utils/format";
import { STATUS_MAP } from "../utils/status";
import ReasonCodeBadges from "./ReasonCodeBadges";

const ACTION_LABELS = {
  appeal: "Appealed",
  resubmit: "Resubmitted",
  email_payer: "Emailed Payer",
  awaiting_info: "Awaiting Info",
  contact_payer: "Contacted Payer",
  bill_patient: "Billed Patient",
  submit_secondary: "Sent to Secondary",
  write_off: "Written Off",
  other: "Other",
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z]/g, "");
}

function buildPatients(claims, workLogEntries) {
  const map = {};

  claims.forEach((c) => {
    const key = normalize(c.patient);
    if (!key) return;
    if (!map[key]) {
      map[key] = {
        name: c.patient,
        key,
        claims: [],
        payers: {},
        totalBilled: 0,
        totalPaid: 0,
        totalDenied: 0,
        openDenials: 0,
        workEntries: [],
      };
    }
    const p = map[key];
    p.claims.push(c);
    p.totalBilled += parseFloat(c.billed) || 0;
    const paid = parseFloat(c.prov_paid) || 0;
    if (paid > 0) p.totalPaid += paid;

    // Payer breakdown
    const payer = c.payer || "Unknown";
    if (!p.payers[payer]) p.payers[payer] = { billed: 0, paid: 0, denied: 0, claims: 0 };
    p.payers[payer].billed += parseFloat(c.billed) || 0;
    if (paid > 0) p.payers[payer].paid += paid;
    p.payers[payer].claims++;
    if (["denied", "pr_only", "adjusted"].includes(c._status)) {
      p.payers[payer].denied++;
      p.openDenials++;
      p.totalDenied += parseFloat(c.billed) || 0;
    }
  });

  // Attach work log entries
  workLogEntries.forEach((e) => {
    const key = normalize(e.patient);
    if (map[key]) {
      map[key].workEntries.push(e);
    }
  });

  // Sort claims by DOS desc within each patient
  Object.values(map).forEach((p) => {
    p.claims.sort((a, b) => {
      const da = new Date(a.dos || 0);
      const db = new Date(b.dos || 0);
      return db - da;
    });
  });

  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

function PatientProfile({ patient, onViewClaims, onSelectClaim }) {
  const [section, setSection] = useState("claims");
  const outstanding = patient.totalBilled - patient.totalPaid;
  const collectionRate = patient.totalBilled > 0
    ? ((patient.totalPaid / patient.totalBilled) * 100).toFixed(1)
    : "0.0";

  return (
    <div style={{ padding: "0 18px 18px" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Total Billed", v: formatDollar(patient.totalBilled), c: "#c2703e" },
          { l: "Collected", v: formatDollar(patient.totalPaid), c: "#6db856" },
          { l: "Outstanding", v: formatDollar(outstanding), c: outstanding > 0 ? "#d4604a" : "#8a8078" },
          { l: "Collection Rate", v: `${collectionRate}%`, c: parseFloat(collectionRate) >= 80 ? "#6db856" : parseFloat(collectionRate) >= 50 ? "#d4a838" : "#d4604a" },
        ].map((c) => (
          <div key={c.l} style={{ padding: "10px 14px", background: "#2a2620", borderRadius: 8, borderTop: `2px solid ${c.c}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#7a7060", marginBottom: 4 }}>{c.l}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "#e8dfd0" }}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[
          ["claims", `Claims (${patient.claims.length})`],
          ["payers", `Payers (${Object.keys(patient.payers).length})`],
          ["history", `Work History (${patient.workEntries.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              background: section === key ? "#c2703e" : "#2a2620",
              color: section === key ? "#1a1714" : "#7a7060",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Claims Timeline */}
      {section === "claims" && (
        <div style={{ display: "grid", gap: 6 }}>
          {patient.claims.map((c, i) => {
            const st = STATUS_MAP[c._status] || STATUS_MAP.adjusted;
            const paid = parseFloat(c.prov_paid) || 0;
            return (
              <div
                key={i}
                onClick={() => onSelectClaim(c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "#2a2620",
                  borderRadius: 8,
                  borderLeft: `3px solid ${st.color}`,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#302b24"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#2a2620"; }}
              >
                <span
                  className="pill"
                  style={{
                    background: st.color + "18",
                    color: st.color,
                    minWidth: 70,
                    justifyContent: "center",
                  }}
                >
                  {st.icon} {st.label}
                </span>
                <span className="mono" style={{ fontSize: 11, color: "#bfb5a3", width: 85 }}>{c.dos}</span>
                <span className="mono" style={{ fontSize: 11, color: "#bfb5a3", width: 50 }}>{c.cpt}</span>
                <span style={{ fontSize: 11, color: "#bfb5a3", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.payer}</span>
                <span className="mono" style={{ fontSize: 11, color: "#bfb5a3", width: 75, textAlign: "right" }}>{formatDollar(parseFloat(c.billed) || 0)}</span>
                <span className="mono" style={{ fontSize: 11, color: paid > 0 ? "#6db856" : "#7a7060", width: 75, textAlign: "right" }}>{formatDollar(paid)}</span>
                <div style={{ width: 90 }}>
                  <ReasonCodeBadges codes={c.reason_codes} onViewClaims={onViewClaims} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payer Breakdown */}
      {section === "payers" && (
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(patient.payers)
            .sort((a, b) => b[1].billed - a[1].billed)
            .map(([payer, data]) => {
              const payerOutstanding = data.billed - data.paid;
              const payerRate = data.billed > 0 ? ((data.paid / data.billed) * 100).toFixed(0) : 0;
              return (
                <div
                  key={payer}
                  style={{
                    padding: "14px 16px",
                    background: "#2a2620",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e8dfd0" }}>{payer}</span>
                    <span style={{ fontSize: 11, color: "#7a7060" }}>{data.claims} claims</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 8, background: "#342f28", marginBottom: 8 }}>
                    {data.paid > 0 && (
                      <div style={{ width: `${(data.paid / data.billed) * 100}%`, background: "#6db856" }} />
                    )}
                    {data.denied > 0 && (
                      <div style={{ width: `${((data.billed - data.paid) / data.billed) * 100}%`, background: "#d4604a30" }} />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 20, fontSize: 11 }}>
                    <span style={{ color: "#bfb5a3" }}>Billed: <span className="mono">{formatDollar(data.billed)}</span></span>
                    <span style={{ color: "#6db856" }}>Paid: <span className="mono">{formatDollar(data.paid)}</span></span>
                    {payerOutstanding > 0 && (
                      <span style={{ color: "#d4604a" }}>Outstanding: <span className="mono">{formatDollar(payerOutstanding)}</span></span>
                    )}
                    {data.denied > 0 && (
                      <span style={{ color: "#7a7060" }}>{data.denied} denied</span>
                    )}
                    <span style={{ color: "#7a7060", marginLeft: "auto" }}>{payerRate}% collected</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Work History */}
      {section === "history" && (
        <>
          {patient.workEntries.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#7a7060" }}>
              No work log entries for this patient
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {patient.workEntries
                .sort((a, b) => new Date(b.workedDate) - new Date(a.workedDate))
                .map((e) => {
                  const isResolved = e.status === "resolved";
                  const isPending = e.status === "pending";
                  return (
                    <div
                      key={e.id}
                      style={{
                        padding: "10px 14px",
                        background: "#2a2620",
                        borderRadius: 8,
                        borderLeft: `3px solid ${isResolved ? "#6db856" : isPending ? "#d4a838" : "#8a8078"}`,
                        opacity: e.status === "written_off" ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "#221f1b",
                            border: "1px solid #342f28",
                            color: "#bfb5a3",
                            textTransform: "uppercase",
                          }}
                        >
                          {ACTION_LABELS[e.action] || e.action}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: isResolved
                              ? "#6db85620"
                              : isPending
                              ? "#d4a83820"
                              : "#8a807820",
                            color: isResolved ? "#6db856" : isPending ? "#d4a838" : "#8a8078",
                          }}
                        >
                          {isResolved ? "✓ Resolved" : isPending ? "⏳ Pending" : "— Written Off"}
                        </span>
                        <span style={{ fontSize: 10, color: "#7a7060", marginLeft: "auto" }}>
                          {formatDate(e.workedDate)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#bfb5a3", marginBottom: e.notes ? 4 : 0 }}>
                        <span>{e.dos}</span>
                        {e.cpt && <span className="mono">{e.cpt}</span>}
                        <span>{e.payer}</span>
                        <span className="mono">{formatDollar(parseFloat(e.billed) || 0)}</span>
                      </div>
                      {e.notes && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#bfb5a3",
                            marginTop: 4,
                            padding: "6px 10px",
                            background: "#221f1b",
                            borderRadius: 6,
                            borderLeft: "2px solid #342f28",
                            lineHeight: 1.5,
                          }}
                        >
                          {e.notes}
                        </div>
                      )}
                      {isResolved && e.resolvedPaid > 0 && (
                        <div style={{ fontSize: 11, color: "#6db856", marginTop: 4, fontWeight: 600 }}>
                          Paid {formatDollar(e.resolvedPaid)} on {formatDate(e.resolvedDate)}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PatientLedger({ claims, workLogEntries, onViewClaims, onSelectClaim }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [expanded, setExpanded] = useState(null);

  const patients = buildPatients(claims, workLogEntries);

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "claims") return b.claims.length - a.claims.length;
    if (sortBy === "billed") return b.totalBilled - a.totalBilled;
    if (sortBy === "outstanding") return (b.totalBilled - b.totalPaid) - (a.totalBilled - a.totalPaid);
    if (sortBy === "denials") return b.openDenials - a.openDenials;
    return 0;
  });

  const totalPatients = patients.length;
  const totalOutstanding = patients.reduce((s, p) => s + (p.totalBilled - p.totalPaid), 0);

  return (
    <>
      {/* Header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { l: "Total Patients", v: totalPatients, c: "#c2703e" },
          { l: "Total Outstanding", v: formatDollar(totalOutstanding), c: "#d4604a" },
          { l: "Patients with Denials", v: patients.filter((p) => p.openDenials > 0).length, c: "#d4a838" },
        ].map((c) => (
          <div key={c.l} className="card" style={{ padding: 16, borderLeft: `3px solid ${c.c}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#7a7060", marginBottom: 4 }}>{c.l}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#e8dfd0" }}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Search patient name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #342f28",
            background: "#2a2620",
            color: "#e8dfd0",
            fontSize: 12,
            width: 280,
            fontFamily: "inherit",
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "7px 10px",
            borderRadius: 7,
            border: "1px solid #342f28",
            background: "#2a2620",
            color: "#e8dfd0",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          <option value="name">Sort: Name A-Z</option>
          <option value="claims">Sort: Most Claims</option>
          <option value="billed">Sort: Highest Billed</option>
          <option value="outstanding">Sort: Highest Outstanding</option>
          <option value="denials">Sort: Most Denials</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#7a7060" }}>
          {sorted.length} patients
        </span>
      </div>

      {/* Patient list */}
      <div style={{ display: "grid", gap: 8 }}>
        {sorted.slice(0, 100).map((p) => {
          const isOpen = expanded === p.key;
          const outstanding = p.totalBilled - p.totalPaid;
          const hasProblems = p.openDenials > 0;

          return (
            <div
              key={p.key}
              className="card"
              style={{ overflow: "hidden" }}
            >
              {/* Clickable row */}
              <div
                onClick={() => setExpanded(isOpen ? null : p.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 18px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#2a2620"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Name + badges */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#e8dfd0" }}>{p.name}</span>
                    {hasProblems && (
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
                        {p.openDenials} denied
                      </span>
                    )}
                    {p.workEntries.filter((e) => e.status === "pending").length > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: "rgba(212,168,56,0.15)",
                          color: "#d4a838",
                        }}
                      >
                        {p.workEntries.filter((e) => e.status === "pending").length} pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats columns */}
                <div style={{ display: "flex", gap: 24, alignItems: "center", flexShrink: 0 }}>
                  <div style={{ textAlign: "right", width: 50 }}>
                    <div style={{ fontSize: 9, color: "#7a7060", textTransform: "uppercase", fontWeight: 700 }}>Claims</div>
                    <div className="mono" style={{ fontSize: 13, color: "#bfb5a3" }}>{p.claims.length}</div>
                  </div>
                  <div style={{ textAlign: "right", width: 80 }}>
                    <div style={{ fontSize: 9, color: "#7a7060", textTransform: "uppercase", fontWeight: 700 }}>Billed</div>
                    <div className="mono" style={{ fontSize: 13, color: "#bfb5a3" }}>{formatDollar(p.totalBilled)}</div>
                  </div>
                  <div style={{ textAlign: "right", width: 80 }}>
                    <div style={{ fontSize: 9, color: "#7a7060", textTransform: "uppercase", fontWeight: 700 }}>Paid</div>
                    <div className="mono" style={{ fontSize: 13, color: "#6db856" }}>{formatDollar(p.totalPaid)}</div>
                  </div>
                  <div style={{ textAlign: "right", width: 80 }}>
                    <div style={{ fontSize: 9, color: "#7a7060", textTransform: "uppercase", fontWeight: 700 }}>Outstand.</div>
                    <div className="mono" style={{ fontSize: 13, color: outstanding > 0 ? "#d4604a" : "#8a8078" }}>{formatDollar(outstanding)}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      color: "#7a7060",
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      marginLeft: 8,
                    }}
                  >
                    ▾
                  </span>
                </div>
              </div>

              {/* Expanded profile */}
              {isOpen && (
                <PatientProfile
                  patient={p}
                  onViewClaims={onViewClaims}
                  onSelectClaim={onSelectClaim}
                />
              )}
            </div>
          );
        })}
        {sorted.length > 100 && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#7a7060", padding: 12 }}>
            Showing 100 of {sorted.length} patients — use search to narrow
          </div>
        )}
      </div>
    </>
  );
}
