import { STATUS_MAP } from "../utils/status";
import { parseDollar, formatDollar } from "../utils/format";

export default function Dashboard({ claims, payers, onNavigate }) {
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
                className="mono"
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 700 }}>{code}</span>
                <span
                  style={{ color: "var(--text-muted)", marginLeft: 6 }}
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
    </>
  );
}
