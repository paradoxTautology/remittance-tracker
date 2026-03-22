import { useState } from "react";
import { useClaims } from "./hooks/useClaims";
import { useWorkLog } from "./hooks/useWorkLog";
import { parseCSV } from "./utils/csv";
import { deriveStatus } from "./utils/status";
import Dashboard from "./components/Dashboard";
import ClaimsTable from "./components/ClaimsTable";
import UploadTab from "./components/UploadTab";
import FieldMapper from "./components/FieldMapper";
import DetailModal from "./components/DetailModal";
import WorkClaimModal from "./components/WorkClaimModal";
import WorkLog from "./components/WorkLog";

export default function App() {
  const [claims, setClaims, clearClaims] = useClaims();
  const workLog = useWorkLog();
  const [tab, setTab] = useState("dashboard");
  const [mapper, setMapper] = useState(null);
  const [detail, setDetail] = useState(null);
  const [workTarget, setWorkTarget] = useState(null); // claim to work
  const [parsing, setParsing] = useState(false);
  const [claimsSearch, setClaimsSearch] = useState("");

  const payers = [...new Set(claims.map((c) => c.payer).filter(Boolean))].sort();

  // Check if a claim has been worked
  const isClaimWorked = (claim) => {
    return workLog.entries.some(
      (e) =>
        e.patient === claim.patient &&
        e.dos === claim.dos &&
        e.cpt === claim.cpt
    );
  };

  const handleViewClaims = (code) => {
    setClaimsSearch(code);
    setTab("claims");
  };

  // Import new claims and cross-reference against work log
  const importClaims = (newClaims) => {
    setClaims([...claims, ...newClaims]);

    // Cross-reference: check if any pending work log entries are now resolved
    const resolved = workLog.crossReference(newClaims);
    if (resolved > 0) {
      alert(`${resolved} previously worked claim${resolved > 1 ? "s" : ""} resolved with this import!`);
    }

    setTab("claims");
  };

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

        importClaims(enriched);
      } catch (err) {
        console.error("PDF parse error:", err);
        alert("Failed to parse PDF: " + err.message);
      }
      setParsing(false);
    } else {
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

    importClaims(mapped);
    setMapper(null);
  };

  const handleClear = () => {
    if (confirm("Clear ALL claim data? This cannot be undone.")) {
      clearClaims();
    }
  };

  const pendingCount = workLog.entries.filter((e) => e.status === "pending").length;

  const TAB_LABELS = {
    dashboard: "Dashboard",
    claims: "Claims",
    worklog: pendingCount > 0 ? `Work Log (${pendingCount})` : "Work Log",
    upload: "Upload",
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
        <DetailModal
          claim={detail}
          onClose={() => setDetail(null)}
          onWorkClaim={(c) => {
            setDetail(null);
            setWorkTarget(c);
          }}
          isWorked={detail ? isClaimWorked(detail) : false}
          onUnwork={(c) => {
            const entry = workLog.entries.find(
              (e) =>
                e.patient === c.patient &&
                e.dos === c.dos &&
                e.cpt === c.cpt
            );
            if (entry) workLog.removeEntry(entry.id);
          }}
        />
      )}
      {workTarget && (
        <WorkClaimModal
          claim={workTarget}
          onSubmit={(entry) => workLog.addEntry(entry)}
          onClose={() => setWorkTarget(null)}
        />
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
            {["dashboard", "claims", "worklog", "upload"].map((t) => (
              <button
                key={t}
                className={`tab ${tab === t ? "tab-on" : "tab-off"}`}
                onClick={() => {
                  setClaimsSearch("");
                  setTab(t);
                }}
              >
                {TAB_LABELS[t]}
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
            onViewClaims={handleViewClaims}
            workLogEntries={workLog.entries}
          />
        )}
        {tab === "claims" && (
          <ClaimsTable
            claims={claims}
            payers={payers}
            onSelectClaim={setDetail}
            initialSearch={claimsSearch}
            workLogEntries={workLog.entries}
          />
        )}
        {tab === "worklog" && (
          <WorkLog
            entries={workLog.entries}
            onUpdateEntry={workLog.updateEntry}
            onRemoveEntry={workLog.removeEntry}
            onClear={workLog.clearLog}
            onViewClaims={handleViewClaims}
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
