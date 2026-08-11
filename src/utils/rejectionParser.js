// rejectionParser.js — TriZetto/Gateway "New Rejections Inquiry" parser
// Input: full extracted PDF text (one line per visual row)
// Output: rejection records with type (clearinghouse|payer), reason, and event timeline

const REC_RE = /^(\d{1,3})\s+(.*?)\s*0(\d{6})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+\$([\d,]+\.\d{2})\s*$/;
const DATE_RE = /^(\d{2}\/\d{2}\/\d{4})\s+(.*)$/;
const TAGS = [
  "277 PAYER REJECTION REPORT",
  "277 PAYER ACCEPTANCE REPORT",
  "PAYER ACKNOWLEDGEMENT REPORT",
  "RECORD OF CLAIMS RECEIVED",
  "Rejected by TriZetto Provider Solutions",
];
const STOP_RE = /^(®|CPT\s*copyright|https:|===PAGE)/;

export function isRejectionsReport(text) {
  return /New Rejections Inquiry/.test(text);
}

function stripZeros(s) { return s.replace(/^0+(?=\d)/, ""); }
function clean(s) {
  return s.replace(/\s+/g, " ").replace(/'\s*$/, "").trim();
}
// Uppercase name-fragment run: tokens like SMITH, or MARY until a token with digits/lowercase
function nameRun(tokens) {
  const out = [];
  for (const t of tokens) {
    if (/^[A-Z'.\-]+,?$/.test(t)) out.push(t);
    else break;
  }
  return out.join(" ");
}
function extractTag(s) {
  for (const tag of TAGS) {
    const i = s.indexOf(tag);
    if (i !== -1) return { text: (s.slice(0, i) + s.slice(i + tag.length)).trim(), tag };
  }
  return { text: s.trim(), tag: null };
}

export function parseRejectionsReport(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const creationDate = (text.match(/Creation Date:\s*([\d/]+)/) || [])[1] || null;
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(REC_RE);
    if (!m) continue;

    const prev = lines[i - 1] || "";
    // Status from the line above the anchor
    const type = /\bPayer\b/.test(prev) ? "payer" : "clearinghouse";
    // Name fragment on the line above (after the status word, before filename junk)
    const fragA = nameRun(prev.replace(/^(Payer|Rejected)\s*/, "").split(/\s+/));
    // File fragment on prev line (claimsPro73126-) — completed by next line (8326.0.txt)
    const fileA = (prev.match(/claims\w+[\d-]*/) || [])[0] || "";

    let j = i + 1;
    let fragB = "", fileB = "";
    if (j < lines.length && /^Reject\b/.test(lines[j])) {
      const rest = lines[j].replace(/^Reject\s*/, "").split(/\s+/);
      fragB = nameRun(rest);
      fileB = (lines[j].match(/[\d.]+\.txt/) || [])[0] || "";
      j++;
    } else if (j < lines.length && /^[\d.]+\.txt\b/.test(lines[j])) {
      // Orphan filename-continuation line (e.g. "8326.0.txt JOHN") — consume it
      fileB = (lines[j].match(/[\d.]+\.txt/) || [])[0] || "";
      j++;
    } else {
      fileB = (prev.match(/[\d.]+\.txt/) || [])[0] || "";
    }

    const nameMain = m[2].trim();
    const nameRaw = clean(nameMain || (fragA + " " + fragB));
    const originalFile = (fileA + fileB) || null;
    const ftMatch = (originalFile || "").match(/claims(Pro|Inst)/i);

    // ---- Event timeline: walk until next record anchor or footer ----
    const events = [];
    let currentEvent = null;
    let preamble = [];
    for (; j < lines.length; j++) {
      const line = lines[j];
      if (REC_RE.test(line) || STOP_RE.test(line)) break;
      // Skip a header-continuation line for the NEXT record (handled when its anchor is hit)
      if (/^(Payer|Rejected)\b/.test(line) && j + 1 < lines.length && REC_RE.test(lines[j + 1])) break;
      const dm = line.match(DATE_RE);
      if (dm) {
        if (currentEvent) events.push(currentEvent);
        currentEvent = { date: dm[1], parts: [...preamble, dm[2]] };
        preamble = [];
      } else if (currentEvent) {
        currentEvent.parts.push(line);
      } else {
        preamble.push(line);
      }
    }
    if (currentEvent) events.push(currentEvent);
    i = j - 1;

    const timeline = events.map((e) => {
      const { text: t, tag } = extractTag(e.parts.join(" "));
      return { date: e.date, text: clean(t), tag };
    });

    // ---- Primary reason ----
    let reason = "";
    if (type === "payer") {
      const rej = [...timeline].reverse().find((e) => e.tag === "277 PAYER REJECTION REPORT");
      reason = rej ? rej.text : "";
    } else {
      const contents = timeline.find((e) => /Contents:\s*-/.test(e.text));
      if (contents) reason = clean(contents.text.replace(/.*Contents:\s*-\s*/, ""));
      else {
        reason = clean(
          timeline
            .filter((e) => e.tag === "Rejected by TriZetto Provider Solutions")
            .map((e) => e.text)
            .filter(Boolean)
            .join(" ")
        );
      }
    }
    reason = clean(reason.replace(/Rejected by TriZetto Provider Solutions/g, ""));

    records.push({
      seq: parseInt(m[1], 10),
      invoice: stripZeros("0" + m[3]),
      patientRaw: nameRaw,
      patient: nameRaw.toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim(),
      payer: m[4].trim(),
      submissionDate: m[5],
      dos: m[6],
      charge: parseFloat(m[7].replace(/,/g, "")),
      rejectionType: type, // 'clearinghouse' | 'payer'
      originalFile,
      fileType: ftMatch ? ftMatch[1] : null,
      reason,
      timeline,
    });
  }

  return { creationDate, records };
}
