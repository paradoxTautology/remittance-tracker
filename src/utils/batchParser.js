// batchParser.js — eMDs e-Claims Batch Report parser
// Input: full extracted PDF text (one line per visual row)
// Output: submissions classified as submitted / excluded / zeroBalance / otherBatch

// Known providers at the practice — row anchor. Add here if a new provider is hired.
const PROVIDERS = ["Preddy, John G", "Houston FNP, Robin"];

const PROV_RE = PROVIDERS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const ROW_RE = new RegExp(
  "^(Yes|No)\\s+(\\d+)\\s+(\\d{2}/\\d{2}/\\d{4})\\s+(\\d{2}/\\d{2}/\\d{4})\\s+" + // included, invoice, postDate, dos
  "(?:([A-Z]{2,4})\\s+)?" +                                                        // optional facility code (no comma)
  "(.+?)\\s+" +                                                                    // patient + account (split later)
  "(" + PROV_RE + ")\\s+(" + PROV_RE + ")\\s+" +                                   // dos provider, rendering provider
  "([A-Z]{2,4})\\s+" +                                                             // financial group
  "(.+?)\\s+(\\S+)\\s+" +                                                          // insurance company, policy no
  "\\$([\\d,]+\\.\\d{2})\\s+\\$([\\d,]+\\.\\d{2})$"                                // charges, balance
);

export function isBatchReport(text) {
  return /e-Claims Batch Report/.test(text);
}

function num(s) { return parseFloat(s.replace(/,/g, "")); }
function stripZeros(s) { return s.replace(/^0+(?=\d)/, ""); }

// Policy prefixes that look like fused insurance words but are really part of the
// policy number (BCBS TX plan prefixes). Extend if a new prefix shows up.
const POLICY_PREFIXES = ["ZGN", "ZGP", "ZGZ", "WAG"];

/**
 * The app's PDF extraction joins items with NO space when the gap is ≤3px, so the
 * insurance name and policy number can fuse into one token, e.g.:
 *   "Blue Cross Blue Shield of TexasZGN943755949"  → "…Texas" + "ZGN943755949"
 *   "AMERIGROUP PROFESSIONAL401W24999"             → "…PROFESSIONAL" + "401W24999"
 *   "UNITED HEALTH CARE /WELL MED129560446"        → "…MED" + "129560446"
 * Split rules on the last token, in order:
 *   1. lowercase→[A-Z or digit] boundary (Texas|ZGN…)
 *   2. whitelisted policy prefix → whole token is the policy (unfused ZGN943755949)
 *   3. ≥3 leading capitals before first digit → fused word, split there (MED|129…)
 *   4. otherwise whole token is the policy (U8166388601, 1DY4DP0WH83, 530955507)
 */
function splitInsurancePolicy(insuranceRaw, lastToken) {
  let head = insuranceRaw.trim();
  let tok = lastToken;

  const lc = tok.match(/^(.*?[a-z])([A-Z0-9][A-Z0-9]*)$/);
  if (lc && /\d/.test(lc[2])) {
    return { insurance: (head + " " + lc[1]).trim(), policy: lc[2] };
  }
  const cap = tok.match(/^([A-Z]+)(\d[A-Z0-9]*)$/);
  if (cap && !POLICY_PREFIXES.includes(cap[1]) && cap[1].length >= 3) {
    return { insurance: (head + " " + cap[1]).trim(), policy: cap[2] };
  }
  return { insurance: head, policy: tok };
}
function normName(raw) {
  // "Gonzalez, Drew Caden" → "GONZALEZ DREW CADEN" (LAST FIRST, app convention)
  return raw.toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

export function parseBatchReport(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const batchNumber = (text.match(/Batch Number:\s*(\d+)/) || [])[1] || null;
  const printDate = (text.match(/Print Date:\s*(\d{2}\/\d{2}\/\d{4})/) || [])[1] || null;
  const fileMatch = text.match(/Filename:.*?([^\\\/\s]+\.txt)/);
  const batchFile = fileMatch ? fileMatch[1] : null;
  const ftMatch = (batchFile || "").match(/claims(Pro|Inst)/i);
  const fileType = ftMatch ? ftMatch[1] : null;

  const rows = [];
  const unparsed = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(ROW_RE);
    if (m) {
      // Split patient section on the trailing digit run — handles tight-gap
      // fusion in the app's extraction (e.g. "Gonzalez, Drew Caden9999955372")
      const pm = m[6].trim().match(/^(.+?)\s*(\d{4,})$/);
      const patientRaw = pm ? pm[1].trim() : m[6].trim();
      const accountRaw = pm ? pm[2] : "";
      const ip = splitInsurancePolicy(m[10], m[11]);
      current = {
        included: m[1] === "Yes",
        invoice: stripZeros(m[2]),
        postDate: m[3],
        dos: m[4],
        facilityCode: m[5] || null,
        patientRaw,
        patient: normName(patientRaw),
        accountNo: stripZeros(accountRaw),
        dosProvider: m[7],
        renderingProvider: m[8],
        financialGroup: m[9],
        payer: ip.insurance,
        policyNo: ip.policy,
        charges: num(m[12]),
        balance: num(m[13]),
        errors: [],
      };
      rows.push(current);
      continue;
    }
    if (current && /^-\s/.test(line)) {
      if (/^-\s*No Errors/i.test(line)) continue; // errors stays []
      const em = line.match(/^-\s*Error Code\s*(\d+):\s*(.+)$/i);
      if (em) current.errors.push({ code: parseInt(em[1], 10), text: em[2].trim() });
      else current.errors.push({ code: null, text: line.replace(/^-\s*/, "") });
      continue;
    }
    // Row-looking line that failed the regex → surface it instead of silently dropping
    if (/^(Yes|No)\s+\d+\s+\d{2}\/\d{2}\/\d{4}/.test(line)) unparsed.push(line);
    if (!/^-\s/.test(line)) current = null; // summary/header lines break error attachment
  }

  const submitted = [], excluded = [], zeroBalance = [], otherBatch = [];
  for (const r of rows) {
    if (r.included) { r.classification = "submitted"; submitted.push(r); }
    else if (r.errors.some((e) => e.code === 5)) { r.classification = "zeroBalance"; zeroBalance.push(r); }
    else if (r.errors.length) { r.classification = "excluded"; excluded.push(r); }
    else { r.classification = "otherBatch"; otherBatch.push(r); }
  }

  return { batchNumber, printDate, batchFile, fileType, submitted, excluded, zeroBalance, otherBatch, all: rows, unparsed };
}
