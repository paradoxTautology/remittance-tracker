import { useState } from "react";

const FIELDS = [
  { key: "patient", label: "Patient Name", hints: /patient|name/i },
  { key: "member_id", label: "Member ID", hints: /member|ident|subscriber/i },
  { key: "acnt", label: "Account #", hints: /acnt|account/i },
  { key: "icn", label: "ICN", hints: /icn|claim.*control/i },
  { key: "dos", label: "Date of Service", hints: /date|dos|service/i },
  { key: "cpt", label: "CPT / Proc Code", hints: /cpt|proc|code|rev/i },
  { key: "payer", label: "Payer", hints: /payer|insur|plan|carrier/i },
  { key: "billed", label: "Billed", hints: /^billed|charge/i },
  { key: "allowed", label: "Allowed", hints: /allowed/i },
  { key: "deduct", label: "Deductible", hints: /deduct/i },
  { key: "coins", label: "Coinsurance", hints: /coins/i },
  { key: "copay", label: "Copay / Pt Resp", hints: /copay|pt.*resp/i },
  { key: "reason_codes", label: "Reason Codes", hints: /reason|adj.*code|denial/i },
  { key: "prov_paid", label: "Prov Paid", hints: /prov.*paid|paid|payment|reimburse/i },
  { key: "status_text", label: "Claim Status", hints: /status|processed|denied/i },
  { key: "rem_codes", label: "Remark Codes", hints: /remark|rem.*code/i },
];

export default function FieldMapper({ headers, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(() => {
    const m = {};
    FIELDS.forEach((f) => {
      m[f.key] = headers.find((h) => f.hints.test(h)) || "";
    });
    return m;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: 28,
          width: 500,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          border: "1px solid var(--border)",
        }}
      >
        <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>
          Map Your CSV Columns
        </h3>
        <p
          style={{
            margin: "0 0 18px",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Match headers to remittance fields. Skip any you don't have.
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          {FIELDS.map((f) => (
            <div
              key={f.key}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <label
                style={{
                  width: 120,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {f.label}
              </label>
              <select
                value={mapping[f.key]}
                onChange={(e) =>
                  setMapping((p) => ({ ...p, [f.key]: e.target.value }))
                }
                style={{ flex: 1 }}
              >
                <option value="">— skip —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(mapping)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
