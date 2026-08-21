// --- Superior HealthPlan EOP Parser ---
// Handles two layout quirks: (1) split headers, where a tall code stack on the
// previous claim (e.g. LO / CO 5 / M77 denials) pushes the next claim's header
// values onto their own line above the empty labels; (2) denied claims, where
// the last non-zero amount is the Denied column, not the payment. Amounts are
// read positionally from the Sub-total row: [charged, allowed, ..., denied, payment].
export function parseSuperiorClaims(text) {
  const claims = [];
  const lines = text.split("\n");
  let curName = "", curMbr = "", curICN = "", curPatCtrl = "";

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    const im = ln.match(/Insured\s*Name:\s*([A-Z][A-Z,\-'. ]+?)\s{2,}Mbr\s*No:\s*(\S+)/);
    if (im) { curName = im[1].trim(); curMbr = im[2]; }
    // Split-header variant: "NAME  MBRNO  MRN: X  ICN" on its own line
    const vm = ln.match(/^([A-Z][A-Z,\-'. ]+?)\s{2,}(\d{5,})\s+MRN:\s*\S+\s+(\S+)\s*$/);
    if (vm) { curName = vm[1].trim(); curMbr = vm[2]; curICN = vm[3]; }
    const cm = ln.match(/Claim\/Ctrl\s*No:\s*(\S+)/);
    if (cm) curICN = cm[1];
    const pm = ln.match(/PatCtrl\s*No:\s*(\S+)/);
    if (pm) curPatCtrl = pm[1];

    const dm = ln.match(/^0100\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\S+?)\//);
    if (dm && curName) {
      // Collect the claim block; capture the Sub-total row for amounts
      let block = ln;
      let subtotal = "";
      for (let j = i+1; j < Math.min(i+25, lines.length); j++) {
        const nextLn = lines[j].trim();
        if (nextLn.startsWith("Sub-total")) { subtotal = nextLn; break; }
        if (nextLn.startsWith("Insured") || nextLn.startsWith("Total")) break;
        block += " " + nextLn;
      }

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

      // Amounts: Sub-total row is positional truth; last amount = payment,
      // which is $0.00 on denials even though the Denied column is non-zero.
      const toNum = (a) => parseFloat(a.replace("$","").replace(/,/g,""));
      const stAmts = (subtotal.match(/\$(\d[\d,.]*\d)/g) || []).map(toNum);
      let billed, allowed, paid;
      if (stAmts.length >= 3) {
        billed = stAmts[0];
        allowed = stAmts[1];
        paid = stAmts[stAmts.length - 1];
      } else {
        // Fallback for layouts without a parseable Sub-total row
        const amts = (block.match(/\$(\d[\d,.]*\d)/g) || []).map(toNum);
        billed = amts[0] || 0;
        allowed = amts[1] || 0;
        paid = 0;
        for (let k = amts.length - 1; k >= 2; k--) {
          if (amts[k] > 0) { paid = amts[k]; break; }
        }
      }

      if (billed > 0 && curName) {
        claims.push({
          patient: curName, member_id: curMbr,
          acnt: curPatCtrl.replace(/^0+(?=\d)/, ""),
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
