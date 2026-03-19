import { useState } from "react";
import { useClaims } from "./hooks/useClaims";
import { parseCSV } from "./utils/csv";
import { deriveStatus } from "./utils/status";
import Dashboard from "./components/Dashboard";
import ClaimsTable from "./components/ClaimsTable";
import UploadTab from "./components/UploadTab";
import FieldMapper from "./components/FieldMapper";
import DetailModal from "./components/DetailModal";

export default function App() {
  const [claims, setClaims, clearClaims] = useClaims();
  const [tab, setTab] = useState("dashboard");
  const [mapper, setMapper] = useState(null);
  const [detail, setDetail] = useState(null);
  const [parsing, setParsing] = useState(false);

  const payers = [...new Set(claims.map((c) => c.payer).filter(Boolean))].sort();

  const handleFile = async (file) => {
    const isPDF = file.name.toLowerCase().endsWith(".pdf");

    if (isPDF) {
      setParsing(true);
      try {
        const buffer = await file.arrayBuffer();
        const { parseRemittancePDF } = await import("./utils/pdfParser");
        const parsed = await parseRemittancePDF(buffer);

        if (!parsed.length) {
          alert("No claims found in this PDF. Make sure it's a TriZetto/Gateway EDI remittance.");
          setParsing(false);
          return;
        }

        // Add internal fields and derive status
        const enriched = parsed.map((c, i) => ({
          ...c,
          billed: c.billed || 0,
          allowed: c.allowed || 0,
          deduct: c.deduct || 0,
          coins: c.coins || 0,
          copay: c.copay || 0,
          prov_paid: c.prov_paid || 0,
          _id: Date.now() + i + Math.random(),
          _status: deriveStatus(c),
          _imported: new Date().toISOString(),
        }));

        setClaims([...claims, ...enriched]);
        setTab("claims");
      } catch (err) {
        console.error("PDF parse error:", err);
        alert("Failed to parse PDF: " + err.message);
      }
      setParsing(false);
    } else {
      // CSV flow — show column mapper
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = parseCSV(e.target.result);
        if (!result || !result.rows.length) return;
        setMapper({ headers: result.headers, rows: result.rows });
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmMapping = (mapping) => {
    const normMap = {};
    Object.entries(mapping).forEach(([field, header]) => {
      if (header) {
        normMap[field] = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
      }
    });

    const mapped = mapper.rows
      .map((r, i) => {
        const c = {};
        Object.entries(normMap).forEach(([field, normH]) => {
          c[field] = r[normH] || "";
        });
        c._id = Date.now() + i + Math.random();
        c._status = deriveStatus(c);
        c._imported = new Date().toISOString();
        return c;
      })
      .filter((c) => c.patient || c.dos);

    setClaims([...claims, ...mapped]);
    setMapper(null);
    setTab("claims");
  };

  const handleClear = () => {
    if (confirm("Clear ALL claim data? This cannot be undone.")) {
      clearClaims();
    }
  };

  return (
    <>
      {mapper && (
        <FieldMapper
          headers={mapper.headers}
          onCancel={() => setMapper(null)}
          onConfirm={handleConfirmMapping}
        />
      )}
      {detail && (
        <DetailModal claim={detail} onClose={() => setDetail(null)} />
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <h1
              style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.3px" }}
            >
              Remittance Tracker
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 3,
              }}
            >
              {claims.length} claims · {payers.length} payers
            </p>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {["dashboard", "claims", "upload"].map((t) => (
              <button
                key={t}
                className={`tab ${tab === t ? "tab-on" : "tab-off"}`}
                onClick={() => setTab(t)}
              >
                {t === "dashboard"
                  ? "Dashboard"
                  : t === "claims"
                  ? "Claims"
                  : "Upload"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "dashboard" && (
          <Dashboard
            claims={claims}
            payers={payers}
            onNavigate={setTab}
          />
        )}
        {tab === "claims" && (
          <ClaimsTable
            claims={claims}
            payers={payers}
            onSelectClaim={setDetail}
          />
        )}
        {tab === "upload" && (
          <UploadTab
            claimCount={claims.length}
            onFile={handleFile}
            onClear={handleClear}
            parsing={parsing}
          />
        )}
      </div>
    </>
  );
}
