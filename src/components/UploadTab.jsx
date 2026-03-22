import { useRef } from "react";
import { STATUS_MAP } from "../utils/status";

export default function UploadTab({ claimCount, onFile, onClear, parsing }) {
  const fileRef = useRef(null);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Upload Remittance Data
        </h3>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 18,
          }}
        >
          Drop a TriZetto PDF directly, or a CSV export from any clearinghouse.
        </p>

        <div
          className="dz"
          onClick={() => !parsing && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!parsing) e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--border)";
            if (!parsing && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
          }}
          style={parsing ? { opacity: 0.5, cursor: "wait" } : undefined}
        >
          {parsing ? (
            <>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--accent)",
                }}
              >
                Parsing PDF...
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Extracting claims from remittance data
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                Drop PDF or CSV here
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                PDFs are parsed automatically — CSVs prompt column mapping
              </div>
            </>
          )}
        </div>

        <input
          type="file"
          accept=".csv,.pdf"
          ref={fileRef}
          onChange={(e) => {
            if (e.target.files[0]) onFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 8,
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 6,
              }}
            >
              PDF (recommended)
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
              TriZetto / Gateway EDI remittance PDFs are parsed directly — all
              fields extracted automatically.
            </p>
          </div>
          <div
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 8,
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 6,
              }}
            >
              CSV
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Any clearinghouse CSV export — you'll map columns to fields after
              upload.
            </p>
          </div>
        </div>
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
              border: "1px solid rgba(192,120,90,0.2)",
              background: "rgba(192,120,90,0.07)",
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
