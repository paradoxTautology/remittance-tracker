import { useState, useEffect } from "react";
import { STATUS_MAP } from "../utils/status";
import { parseDollar, formatDollar } from "../utils/format";
import { exportClaimsCSV } from "../utils/csv";
import ReasonCodeBadges from "./ReasonCodeBadges";

function SortTh({ col, currentCol, currentDir, onSort, children, align }) {
  const active = currentCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        textAlign: align || "left",
        cursor: "pointer",
        userSelect: "none",
        padding: "10px 12px",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: active ? "var(--accent)" : "var(--text-muted)",
        borderBottom: "1px solid var(--border)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
      {active ? (currentDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );
}

export default function ClaimsTable({ claims, payers, onSelectClaim, initialSearch, workLogEntries = [] }) {
  const [filter, setFilter] = useState("all");
  const [payerFilter, setPayerFilter] = useState("all");
  const [search, setSearch] = useState(initialSearch || "");
  const [sortCol, setSortCol] = useState("dos");
  const [sortDir, setSortDir] = useState("desc");

  // Sync when navigated from Dashboard "View Claims"
  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const WORK_ACTIONS = {
    appeal: { label: "Appealed", color: "#3b82f6", icon: "⟳" },
    resubmit: { label: "Resubmitted", color: "#3b82f6", icon: "⟳" },
    bill_patient: { label: "Billed Pt", color: "#f97316", icon: "$" },
    contact_payer: { label: "Contacted", color: "#8b5cf6", icon: "✆" },
    submit_secondary: { label: "Sent 2nd", color: "#a855f7", icon: "→" },
    write_off: { label: "Written Off", color: "#6b7280", icon: "—" },
    other: { label: "Worked", color: "#3b82f6", icon: "✎" },
  };

  const getWorkStatus = (claim) => {
    const entry = workLogEntries.find(
      (e) =>
        e.patient === claim.patient &&
        e.dos === claim.dos &&
        e.cpt === claim.cpt &&
        e.status !== "resolved"
    );
    if (!entry) return null;
    return WORK_ACTIONS[entry.action] || WORK_ACTIONS.other;
  };

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const filtered = claims
    .filter((c) => {
      if (filter !== "all" && c._status !== filter) return false;
      if (payerFilter !== "all" && c.payer !== payerFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return [c.patient, c.cpt, c.acnt, c.reason_codes, c.member_id, c.icn]
          .some((v) => (v || "").toLowerCase().includes(s));
      }
      return true;
    })
    .sort((a, b) => {
      let va = a[sortCol] || "";
      let vb = b[sortCol] || "";
      if (
        ["billed", "allowed", "prov_paid", "deduct", "coins", "copay"].includes(
          sortCol
        )
      ) {
        va = parseDollar(va);
        vb = parseDollar(vb);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search patient, CPT, ACNT, reason code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            fontSize: 12,
            width: 280,
            fontFamily: "inherit",
          }}
        />
        <select
          value={payerFilter}
          onChange={(e) => setPayerFilter(e.target.value)}
        >
          <option value="all">All Payers</option>
          {payers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button
            className={`fb ${filter === "all" ? "fb-on" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          {Object.entries(STATUS_MAP).map(([k, v]) => {
            const n = claims.filter((c) => c._status === k).length;
            return n ? (
              <button
                key={k}
                className={`fb ${filter === k ? "fb-on" : ""}`}
                onClick={() => setFilter(k)}
              >
                {v.label}
              </button>
            ) : null;
          })}
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {filtered.length} results
          </span>
          {filtered.length > 0 && (
            <button
              onClick={() => exportClaimsCSV(filtered)}
              className="fb"
              style={{ borderColor: "rgba(34,197,94,0.3)", color: "var(--green)" }}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            {claims.length === 0
              ? "Upload claims to see data"
              : "No claims match filters"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "10px 12px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                      textTransform: "uppercase",
                    }}
                  >
                    Status
                  </th>
                  <SortTh col="patient" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort}>Patient</SortTh>
                  <SortTh col="acnt" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort}>Invoice #</SortTh>
                  <SortTh col="dos" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort}>DOS</SortTh>
                  <SortTh col="cpt" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort}>CPT</SortTh>
                  <SortTh col="payer" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort}>Payer</SortTh>
                  <SortTh col="billed" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort} align="right">Billed</SortTh>
                  <SortTh col="allowed" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort} align="right">Allowed</SortTh>
                  <SortTh col="prov_paid" currentCol={sortCol} currentDir={sortDir} onSort={toggleSort} align="right">Paid</SortTh>
                  <th
                    style={{
                      padding: "10px 12px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                      textTransform: "uppercase",
                    }}
                  >
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((c, i) => {
                  const st = STATUS_MAP[c._status] || STATUS_MAP.adjusted;
                  const paid = parseDollar(c.prov_paid);
                  const workSt = getWorkStatus(c);
                  const displaySt = workSt || st;
                  return (
                    <tr key={i} onClick={() => onSelectClaim(c)}>
                      <td>
                        <span
                          className="pill"
                          style={{
                            background: displaySt.color + "18",
                            color: displaySt.color,
                          }}
                        >
                          {displaySt.icon} {displaySt.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          maxWidth: 150,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.patient}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {(c.acnt || "").replace(/^0+/, "")}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {c.dos}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {c.cpt}
                      </td>
                      <td
                        style={{
                          fontSize: 11,
                          maxWidth: 130,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.payer}
                      </td>
                      <td
                        className="mono"
                        style={{ textAlign: "right", fontSize: 11 }}
                      >
                        {formatDollar(parseDollar(c.billed))}
                      </td>
                      <td
                        className="mono"
                        style={{ textAlign: "right", fontSize: 11 }}
                      >
                        {formatDollar(parseDollar(c.allowed))}
                      </td>
                      <td
                        className="mono"
                        style={{
                          textAlign: "right",
                          fontSize: 11,
                          color:
                            paid > 0
                              ? "var(--green)"
                              : paid < 0
                              ? "var(--red)"
                              : "var(--text-muted)",
                        }}
                      >
                        {formatDollar(paid)}
                      </td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          maxWidth: 150,
                          padding: "8px 12px",
                        }}
                      >
                        <ReasonCodeBadges codes={c.reason_codes} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <div
                style={{
                  padding: 12,
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Showing 200 of {filtered.length} — use search/filters
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
