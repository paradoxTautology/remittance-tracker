/**
 * Parse CSV text into headers and row objects.
 * Handles quoted fields with commas inside.
 */
export function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null;

  const headers = lines[0].split(",").map((h) => h.trim());
  const normHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "_")
  );

  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const vals = [];
      let cur = "";
      let inQuotes = false;

      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === "," && !inQuotes) {
          vals.push(cur.trim());
          cur = "";
        } else cur += ch;
      }
      vals.push(cur.trim());

      const obj = {};
      normHeaders.forEach((h, i) => {
        obj[h] = vals[i] || "";
      });
      return obj;
    });

  return { headers, normHeaders, rows };
}

/**
 * Export an array of claim objects as a downloadable CSV file.
 */
export function exportClaimsCSV(claims, filename = "claims_export.csv") {
  const cols = [
    "patient",
    "member_id",
    "acnt",
    "icn",
    "dos",
    "cpt",
    "payer",
    "billed",
    "allowed",
    "deduct",
    "coins",
    "copay",
    "reason_codes",
    "prov_paid",
    "status_text",
    "rem_codes",
    "_status",
  ];

  const lines = [
    cols.join(","),
    ...claims.map((c) =>
      cols
        .map((h) => `"${(c[h] || "").toString().replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
