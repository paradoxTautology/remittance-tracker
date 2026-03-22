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
  // Generate identity fingerprint (who is this claim for?)
  const claimIdentity = (c) => {
    const name = (c.patient || "").toLowerCase().replace(/[^a-z]/g, "");
    const dos = (c.dos || "").trim();
    const cpt = (c.cpt || "").trim();
    const payer = (c.payer || "").toLowerCase().replace(/[^a-z]/g, "");
    const acnt = (c.acnt || "").trim();
    if (acnt) return `${name}|${dos}|${acnt}`;
    return `${name}|${dos}|${cpt}|${payer}`;
  };

  // Check if two claims have the same financial outcome
  const sameOutcome = (a, b) => {
    const paidA = parseFloat(a.prov_paid) || 0;
    const paidB = parseFloat(b.prov_paid) || 0;
    return paidA === paidB && a._status === b._status;
  };

  const importClaims = (newClaims) => {
    // Index existing claims by identity
    const existingMap = {};
    claims.forEach((c, i) => {
      const id = claimIdentity(c);
      if (!existingMap[id]) existingMap[id] = [];
      existingMap[id].push({ claim: c, index: i });
    });

    const added = [];       // brand new claims
    const updated = [];     // same claim, different outcome (now paid)
    let skipped = 0;        // exact duplicates
    const updatedIndices = new Set();

    const seenInBatch = new Set();

    newClaims.forEach((incoming) => {
      const id = claimIdentity(incoming);

      // Dedup within the new batch
      if (seenInBatch.has(id)) {
        skipped++;
        return;
      }

      const matches = existingMap[id];

      if (!matches || matches.length === 0) {
        // Brand new claim
        added.push(incoming);
        seenInBatch.add(id);
        return;
      }

      // Check if outcome changed
      const incomingPaid = parseFloat(incoming.prov_paid) || 0;
      const existingClaim = matches[0].claim;
      const existingPaid = parseFloat(existingClaim.prov_paid) || 0;

      if (incomingPaid === existingPaid) {
        // Exact duplicate — skip
        skipped++;
      } else {
        // Updated outcome — replace the old claim
        updated.push({
          oldIndex: matches[0].index,
          newClaim: incoming,
          oldPaid: existingPaid,
          newPaid: incomingPaid,
        });
        seenInBatch.add(id);
      }
    });

    // Build the updated claims array
    let updatedClaims = [...claims];

    // Apply updates (replace old claims with new outcomes)
    updated.forEach((u) => {
      updatedClaims[u.oldIndex] = {
        ...u.newClaim,
        _id: updatedClaims[u.oldIndex]._id, // keep original ID
        _imported: new Date().toISOString(),
      };
    });

    // Add brand new claims
    updatedClaims = [...updatedClaims, ...added];

    setClaims(updatedClaims);

    // Cross-reference work log: resolve entries where claims are now paid
    const allNewAndUpdated = [
      ...added,
      ...updated.map((u) => u.newClaim),
    ];
    const resolved = workLog.crossReference(allNewAndUpdated);

    // Build summary message
    const parts = [];
    if (added.length > 0) {
      parts.push(`${added.length} new claim${added.length !== 1 ? "s" : ""} added`);
    }
    if (updated.length > 0) {
      parts.push(`${updated.length} claim${updated.length !== 1 ? "s" : ""} updated with new payment`);
    }
    if (skipped > 0) {
      parts.push(`${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped`);
    }
    if (resolved > 0) {
      parts.push(`${resolved} worked claim${resolved !== 1 ? "s" : ""} auto-resolved`);
    }

    if (parts.length > 0) {
      alert(parts.join(" · "));
    } else {
      alert("No changes — all claims already exist with the same data.");
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
