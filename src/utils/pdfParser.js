import * as pdfjsLib from "pdfjs-dist";

// Polyfill: Electron may lack Uint8Array.toHex
if (!Uint8Array.prototype.toHex) {
  Uint8Array.prototype.toHex = function () {
    return Array.from(this).map((b) => b.toString(16).padStart(2, "0")).join("");
  };
}

// Use bundled worker
// Use custom worker with polyfill
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

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
// --- Superior HealthPlan EOP Parser ---
function parseSuperiorClaims(text) {
  const claims = [];
  const lines = text.split("\n");
  let curName = "", curMbr = "", curICN = "", curPatCtrl = "";

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    const im = ln.match(/Insured\s*Name:\s*([A-Z][A-Z, ]+?)\s{2,}Mbr\s*No:\s*(\S+)/);
    if (im) { curName = im[1].trim(); curMbr = im[2]; }
    const cm = ln.match(/Claim\/Ctrl\s*No:\s*(\S+)/);
    if (cm) curICN = cm[1];
    const pm = ln.match(/PatCtrl\s*No:\s*(\S+)/);
    if (pm) curPatCtrl = pm[1];

    const dm = ln.match(/^0100\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\S+?)\//);
    if (dm && curName) {
      // Grab enough lines to capture full claim row including Payment/Withheld column
      let block = ln;
      for (let j = i+1; j < Math.min(i+25, lines.length); j++) {
        const nextLn = lines[j].trim();
        if (nextLn.startsWith("Sub-total") || nextLn.startsWith("Insured") || nextLn.startsWith("Total")) break;
        block += " " + nextLn;
      }

      // Extract all dollar amounts
      const amts = (block.match(/\$(\d[\d,.]*\d)/g) || []).map(a => parseFloat(a.replace("$","").replace(",","")));

      // Extract reason codes - both group codes (CO 45, OA 23) and plain numeric (92)
      const codes = [];
      const groupCodes = block.match(/(CO|OA|PR|CR)\s+(\d+)/g);
      if (groupCodes) groupCodes.forEach(c => codes.push(c.replace(/\s+/g, "-")));
      // Check for standalone EX codes (like 92, us) near group codes
      // They appear in EXPL Codes column, often before or on same line as CO/OA/PR/CR
      const exMatches = block.match(/(?:^|\s)(\d{2,3})\s+(?:CO|OA|PR|CR)/g);
      if (exMatches) {
        exMatches.forEach(m => {
          const num = m.trim().match(/^(\d{2,3})/);
          if (num && !codes.includes(num[1])) codes.unshift(num[1]);
        });
      }
      // Also check for "us" code (payment in full for Medicare/Medicaid)
      if (block.includes(" us ") || block.match(/\bus\b.*CO/)) {
        if (!codes.includes("us")) codes.unshift("us");
      }

      // Payment: find the last dollar amount > 0 that isn't billed or allowed
      // In Superior EOPs, the payment column comes after all the $0.00 fields
      let paid = 0;
      const billed = amts[0] || 0;
      const allowed = amts[1] || 0;
      // Walk backwards, skip trailing $0.00s, grab the first non-zero
      for (let k = amts.length - 1; k >= 2; k--) {
        if (amts[k] > 0) {
          paid = amts[k];
          break;
        }
      }


      if (billed > 0 && curName) {
        claims.push({
          patient: curName, member_id: curMbr, acnt: curPatCtrl,
          dos: dm[1], payer: "Superior HealthPlan", cpt: dm[2],
          billed: billed.toFixed(2), allowed: allowed.toFixed(2),
          deductible: "0.00", coinsurance: "0.00", copay: "0.00",
          prov_paid: paid.toFixed(2),
          reason_codes: codes.join(","), icn: curICN,
        });
      }
    }
  }
  const seen = new Set();
  return claims.filter(c => { const k = c.icn+c.dos; if (seen.has(k)) return false; seen.add(k); return true; });
}

function detectFormat(text) {
  if (text.includes("EXPLANATION OF PAYMENT") && text.includes("Superior HealthPlan")) return "superior";
  return "trizetto";
}

export async function parseRemittancePDF(fileBuffer) {
  const text = await extractTextFromPDF(fileBuffer);
  const fmt = detectFormat(text);
  if (fmt === "superior") return parseSuperiorClaims(text);
  return parseClaims(text);
}
