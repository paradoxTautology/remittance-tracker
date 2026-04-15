import * as pdfjsLib from "pdfjs-dist";

// Polyfill: Electron may lack Uint8Array.toHex
if (!Uint8Array.prototype.toHex) {
  Uint8Array.prototype.toHex = function () {
    return Array.from(this).map((b) => b.toString(16).padStart(2, "0")).join("");
  };
}

// Use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// --- Regex patterns ---

const RE_PATIENT =
  /PATIENT\s+NAME:\s+(.+?)\s{2,}MEMBER\s+IDENTIFICATION:\s+(\S+)\s+ACNT\s+(\S+)\s+ICN\s+(\S+)/;

const RE_DOLLAR = /\(?\$[\d,]+\.?\d*\)?/g;
const RE_DATE = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g;
const RE_CPT = /\b(\d{5}|[A-Z]\d{4})\b/g;
const RE_REASON = /\b((?:PR|CO|OA|PI|CR)-[A-Z]?\d+)\b/g;
const RE_REMARK = /\b(N\d{1,4})\b/g;

const PAYER_PATTERNS = [
  [/Medicare of Texas UB/i, "Medicare of Texas UB"],
  [/TX MEDICARE PART B/i, "TX Medicare Part B"],
  [/United HealthCare/i, "United HealthCare"],
  [/\bUHC\b/, "UHC"],
  [/Blue Cross Blue Shield/i, "BCBS of Texas"],
  [/Medicaid of Texas/i, "Medicaid of Texas"],
];

// --- Helpers ---

function parseDollar(s) {
  if (!s) return 0;
  s = s.replace(/,/g, "");
  const neg = s.includes("(") && s.includes(")");
  s = s.replace(/[$()]/g, "");
  const val = parseFloat(s) || 0;
  return neg ? -val : val;
}

function extractDollars(line) {
  return [...line.matchAll(/\(?\$[\d,]+\.?\d*\)?/g)].map((m) =>
    parseDollar(m[0])
  );
}

function matchAll(str, re) {
  const regex = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return [...str.matchAll(regex)].map((m) => m[1] || m[0]);
}

function detectPayer(line) {
  const stripped = line.trim();
  if (stripped.length > 100 || stripped.includes("PATIENT")) return null;
  for (const [pat, name] of PAYER_PATTERNS) {
    if (pat.test(stripped)) return name;
  }
  return null;
}

function isSectionTotals(line) {
  return /^\s*TOTALS:\s+\d+\s+\$/.test(line);
}

function isClaimTotals(line) {
  return /^\s*TOTALS:\s+\(?\$/.test(line);
}

function isSkipLine(line) {
  const s = line.trim();
  if (!s) return true;
  if (s.startsWith("\f")) return true;
  if (/TriZetto Provider Solutions/.test(s)) return true;
  if (/^https?:\/\//.test(s)) return true;
  if (/^\d+\/\d+\s*$/.test(s)) return true;
  if (/^\s*(NPI\/|PROVIDER\s+#|EFT\s+#|Check\s+#|Non-payment\s+#|SITE\s+\d)/.test(s)) return true;
  if (/^\s*(Prov\.\s|Begin\/End|ID\s+Date\s+Units|Claims\s+Billed|\(CoPay\)\s+Red)/.test(s)) return true;
  if (/^\s*Resp\.\s+Filing|^\s*Adj\.\s+Codes/.test(s)) return true;
  return false;
}

// --- PDF text extraction ---

async function extractTextFromPDF(fileBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group items by Y position to reconstruct lines
    const itemsByY = {};
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      // Round Y to group items on the same line (within 2px)
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!itemsByY[y]) itemsByY[y] = [];
      itemsByY[y].push({
        x: item.transform[4],
        text: item.str,
        width: item.width,
      });
    }

    // Sort by Y descending (PDF coords are bottom-up), then X
    const sortedYs = Object.keys(itemsByY)
      .map(Number)
      .sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = itemsByY[y].sort((a, b) => a.x - b.x);

      // Reconstruct line with spacing
      let line = "";
      let lastEnd = 0;
      for (const item of items) {
        const gap = item.x - lastEnd;
        if (gap > 10 && line.length > 0) {
          line += "  "; // gap = column separator
        } else if (gap > 3 && line.length > 0) {
          line += " ";
        }
        line += item.text;
        lastEnd = item.x + item.width;
      }
      lines.push(line);
    }

    lines.push("\f"); // page break
  }

  return lines.join("\n");
}

// --- Parser ---

function parseClaims(text) {
  const lines = text.split("\n");
  const claims = [];
  let currentPayer = "";
  let inGlossary = false;
  let inProvAdj = false;
  let claim = null;

  function flush() {
    if (claim && claim.patient) {
      claims.push(claim);
    }
    claim = null;
  }

  function addReasons(codes) {
    if (!claim || !codes.length) return;
    const existing = new Set(claim.reason_codes.split(/\s+/).filter(Boolean));
    const added = codes.filter((c) => !existing.has(c));
    if (added.length) {
      claim.reason_codes = (claim.reason_codes + " " + added.join(" ")).trim();
    }
  }

  function addRemarks(codes) {
    if (!claim || !codes.length) return;
    const existing = new Set(claim.rem_codes.split(/\s+/).filter(Boolean));
    const added = codes.filter((c) => !existing.has(c));
    if (added.length) {
      claim.rem_codes = (claim.rem_codes + " " + added.join(" ")).trim();
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();

    if (isSkipLine(line)) {
      i++;
      continue;
    }

    // Payer header
    const payer = detectPayer(stripped);
    if (payer) {
      currentPayer = payer;
      inGlossary = false;
      inProvAdj = false;
      i++;
      continue;
    }

    // Glossary / Provider Adj (skip)
    if (stripped.includes("GLOSSARY:")) {
      inGlossary = true;
      i++;
      continue;
    }
    if (stripped.includes("Provider Adjustment Detail")) {
      inProvAdj = true;
      i++;
      continue;
    }
    if (inGlossary || inProvAdj) {
      if (stripped.includes("PATIENT NAME:")) {
        inGlossary = false;
        inProvAdj = false;
      } else if (detectPayer(stripped)) {
        inGlossary = false;
        inProvAdj = false;
      } else {
        i++;
        continue;
      }
    }

    // Section totals (skip)
    if (isSectionTotals(stripped)) {
      i++;
      continue;
    }

    // New patient block
    const patientMatch = stripped.match(RE_PATIENT);
    if (patientMatch) {
      flush();
      let icn = patientMatch[4].replace(/\s*(ASG|Y)\s*$/, "").trim();
      claim = {
        patient: patientMatch[1].trim(),
        member_id: patientMatch[2].trim(),
        acnt: patientMatch[3].trim(),
        icn,
        payer: currentPayer,
        dos: "",
        cpt: "",
        billed: 0,
        allowed: 0,
        deduct: 0,
        coins: 0,
        copay: 0,
        reason_codes: "",
        prov_paid: 0,
        status_text: "",
        rem_codes: "",
      };
      i++;
      continue;
    }

    if (!claim) {
      i++;
      continue;
    }

    // Status / Payment line
    const statusPatterns = [
      /^(Denied)\s+Claim\s+Payment\s+Amount:\s*/,
      /^(Processed as (?:Primary|Secondary)(?:,\s*Forwarded.+?)?)\s*Claim\s+Payment\s+Amount:\s*/,
      /^(Reversal of Previous Payment)\s+Claim\s+Payment\s+Amount:\s*/,
    ];

    let statusMatched = false;
    for (const sp of statusPatterns) {
      const m = stripped.match(sp);
      if (m) {
        claim.status_text = m[1].trim();
        const afterMatch = stripped.slice(m[0].length);
        const dollars = [...afterMatch.matchAll(/\(?\$[\d,]+\.?\d*\)?/g)];
        if (dollars.length) {
          claim.prov_paid = parseDollar(dollars[0][0]);
        } else if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const nextDollars = [...nextLine.matchAll(/\(?\$[\d,]+\.?\d*\)?/g)];
          if (nextDollars.length) {
            claim.prov_paid = parseDollar(nextDollars[0][0]);
            i++;
          }
        }
        statusMatched = true;
        break;
      }
    }
    if (statusMatched) {
      i++;
      continue;
    }

    // INSURED NAME (skip)
    if (stripped.startsWith("INSURED NAME:")) {
      i++;
      continue;
    }

    // PT GRP / reason code lines
    if (stripped.startsWith("PT GRP") || stripped.startsWith("ASG")) {
      addReasons(matchAll(stripped, RE_REASON));
      i++;
      continue;
    }

    // Standalone reason code (Medicaid: "CO-22,")
    if (/^\s*[A-Z]{1,2}-[A-Z]?\d+[,;]?\s*$/.test(stripped)) {
      addReasons([stripped.replace(/[,;\s]/g, "")]);
      i++;
      continue;
    }

    // Claim TOTALS
    if (isClaimTotals(stripped)) {
      const dollars = extractDollars(stripped);
      if (dollars.length >= 2) {
        claim.billed = dollars[0];
        claim.allowed = dollars[1];
      }
      if (dollars.length >= 3) claim.deduct = dollars[2];
      if (dollars.length >= 4) claim.coins = dollars[3];
      if (dollars.length >= 5) claim.copay = dollars[4];
      i++;
      continue;
    }

    // Data line with date + dollars
    const dates = matchAll(stripped, RE_DATE);
    const dollarsOnLine = [...stripped.matchAll(/\(?\$[\d,]+\.?\d*\)?/g)];

    if (dates.length && dollarsOnLine.length) {
      if (!claim.dos) claim.dos = dates[0];

      const cpts = matchAll(stripped, RE_CPT).filter(
        (c) => !c.startsWith("0") && !dates[0].replace(/\//g, "").includes(c)
      );
      if (cpts.length && !claim.cpt) claim.cpt = cpts[0];

      addReasons(matchAll(stripped, RE_REASON));
      addRemarks(matchAll(stripped, RE_REMARK));
      i++;
      continue;
    }

    // Date-only line
    if (dates.length && !dollarsOnLine.length) {
      const cpts = matchAll(stripped, RE_CPT).filter(
        (c) => !c.startsWith("0") && !dates[0].replace(/\//g, "").includes(c)
      );
      if (cpts.length && !claim.cpt) claim.cpt = cpts[0];
      i++;
      continue;
    }

    // Continuation: CPT code on its own line
    const cptMatch = stripped.match(/^\s*(\d{5}|[A-Z]\d{4})[,\s]/);
    if (cptMatch && !claim.cpt) {
      const code = cptMatch[1];
      if (!code.startsWith("0")) claim.cpt = code;
      i++;
      continue;
    }

    // Continuation: reason/remark codes
    addReasons(matchAll(stripped, RE_REASON));
    addRemarks(matchAll(stripped, RE_REMARK));

    i++;
  }

  flush();
  return claims;
}

// --- Public API ---

/**
 * Parse a TriZetto ERA/EOB PDF file into claim objects.
 * @param {ArrayBuffer} fileBuffer - PDF file as ArrayBuffer
 * @returns {Promise<Array>} Array of claim objects
 */
export async function parseRemittancePDF(fileBuffer) {
  const text = await extractTextFromPDF(fileBuffer);
  return parseClaims(text);
}
