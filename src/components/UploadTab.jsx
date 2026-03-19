import { useRef } from "react";
import { STATUS_MAP } from "../utils/status";

export default function UploadTab({ claimCount, onFile, onClear }) {
  const fileRef = useRef(null);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Upload Remittance CSV
        </h3>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 18,
          }}
        >
          Export your ERA/EOB data as CSV from TriZetto, Availity, or your
          clearinghouse.
        </p>

        <div
          className="dz"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--border)";
            if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            Drop CSV here or click to browse
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            You'll map columns after upload
          </div>
        </div>

        <input
          type="file"
          accept=".csv"
          ref={fileRef}
          onChange={(e) => {
            if (e.target.files[0]) onFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Supported Fields
        </h4>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.7,
          }}
        >
          Patient Name, Member ID, Account #, ICN, Date of Service, CPT/Proc
          Code, Payer, Billed, Allowed, Deductible, Coinsurance, Copay/Pt Resp,
          Reason Codes, Provider Paid, Claim Status, Remark Codes
        </p>
        <p
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: 6,
          }}
        >
          You don't need all columns — just map what your CSV has.
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Auto-Detected Statuses
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ color: v.color, fontWeight: 700, width: 16 }}>
                {v.icon}
              </span>
              {v.label}
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: 8,
          }}
        >
          Derived from reason codes + payment amounts (PR-24 → Denied, CO-B11 →
          Forwarded, etc.)
        </p>
      </div>

      {claimCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClear}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.07)",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Clear All Data
          </button>
        </div>
      )}
    </div>
  );
}
