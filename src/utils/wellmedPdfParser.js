/**
 * WellMed PDF Remittance Parser
 * Parses WellMed/QuicRemit virtual card payment EOB PDFs.
 * Returns claim objects matching the same shape as the TriZetto parser.
 */

const WM_CODE_MAP = {
  '301': 'WM-301', '302': 'WM-302', '303': 'WM-303',
  '314': 'WM-314', '391': 'WM-391', '418': 'WM-418', '852': 'WM-852'
};

const KNOWN_CODES = new Set(Object.keys(WM_CODE_MAP));

function addCode(claim, code) {
  const wmCode = WM_CODE_MAP[code];
  if (wmCode && !claim.reason_codes.includes(wmCode)) {
    claim.reason_codes = (claim.reason_codes + ' ' + wmCode).trim();
  }
}

function extractNums(line) {
  const nums = [];
  for (const m of line.matchAll(/\$?([\d,]+\.\d{2})\b/g)) {
    nums.push(parseFloat(m[1].replace(/,/g, '')));
  }
  return nums;
}

export function parseWellMedClaims(text) {
  const claims = [];
  const lines = text.split('\n');
  let claim = null;

  function flush() {
    if (claim && claim.patient) {
      claim.billed = Math.round(claim.billed * 100) / 100;
      claim.allowed = Math.round(claim.allowed * 100) / 100;
      claim.deduct = Math.round(claim.deduct * 100) / 100;
      claim.coins = Math.round(claim.coins * 100) / 100;
      claim.copay = Math.round(claim.copay * 100) / 100;
      claim.prov_paid = Math.round(claim.prov_paid * 100) / 100;
      claims.push(claim);
    }
    claim = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) continue;

    // Stop at summary/appeals sections
    if (/^Statement Summary/i.test(ln)) break;
    if (/^Explanations$/i.test(ln)) break;
    if (/^Attention Non-contracted/i.test(ln)) break;
    if (/^Document Total/i.test(ln)) break;

    // --- New claim block ---
    const claimMatch = ln.match(/Claim#:\s*(\d+)/);
    if (claimMatch) {
      flush();
      claim = {
        patient: '', member_id: '', acnt: '', icn: claimMatch[1],
        payer: 'WellMed', dos: '', cpt: '',
        billed: 0, allowed: 0, deduct: 0, coins: 0, copay: 0,
        reason_codes: '', prov_paid: 0, status_text: '', rem_codes: ''
      };
      const acntMatch = ln.match(/Patient Acct#:\s*(\S+)/);
      if (acntMatch) claim.acnt = acntMatch[1];
      continue;
    }

    if (!claim) continue;

    // --- Claim header fields ---
    const memMatch = ln.match(/MemberID:\s*(\S+)/);
    if (memMatch) {
      claim.member_id = memMatch[1];
      // Patient Name might be on same line
      const patOnLine = ln.match(/Patient Name:\s*(.+?)(?:\s{2,}|$)/);
      if (patOnLine) claim.patient = patOnLine[1].replace(/\s{2,}.*/, '').trim();
      continue;
    }

    const patMatch = ln.match(/Patient Name:\s*(.+)/);
    if (patMatch && !claim.patient) {
      claim.patient = patMatch[1].replace(/\s{2,}.*/, '').trim();
      continue;
    }

    const acntMatch = ln.match(/Patient Acct#:\s*(\S+)/);
    if (acntMatch && !claim.acnt) { claim.acnt = acntMatch[1]; continue; }

    // --- Service line: get DOS, CPT, and explanation codes only ---
    const svcMatch = ln.match(/^(\d{2}\/\d{2}\/\d{2,4})\s+(\d{5})/);
    if (svcMatch) {
      if (!claim.dos) claim.dos = svcMatch[1];
      if (!claim.cpt) claim.cpt = svcMatch[2];

      // Grab WellMed explanation codes (3-digit numbers)
      for (const m of ln.matchAll(/\b(\d{3})\b/g)) {
        if (KNOWN_CODES.has(m[1])) addCode(claim, m[1]);
      }
      continue;
    }

    // --- Subtotals line: reliable source for ALL financial amounts ---
    // Format: "Subtotals:  125.00  $125.00  $2.50  0.00  0.00  0.00  0.00  $0.00  122.50"
    // Columns: charge, allowed, withheld, co-ins, copay, deductible, not_covered, discount, paid
    if (/^Subtotals:/i.test(ln)) {
      const nums = extractNums(ln);
      if (nums.length >= 9) {
        claim.billed = nums[0];
        claim.allowed = nums[1];
        // nums[2] = withheld (sequestration, captured via WM-314)
        claim.coins = nums[3];
        claim.copay = nums[4];
        claim.deduct = nums[5];
        // nums[6] = not covered
        // nums[7] = discount
        claim.prov_paid = nums[8];
      } else if (nums.length >= 2) {
        claim.billed = nums[0];
        claim.allowed = nums[1];
      }
      continue;
    }

    // --- Net Claim Payment (override prov_paid — most reliable) ---
    if (/Net Claim Payment/i.test(ln)) {
      const payMatch = ln.match(/\$?([\d,]+\.\d{2})/);
      if (payMatch) {
        claim.prov_paid = parseFloat(payMatch[1].replace(/,/g, ''));
      } else {
        // Amount on next line
        const nextLn = (lines[i + 1] || '').trim();
        const nextMatch = nextLn.match(/^\$?([\d,]+\.\d{2})$/);
        if (nextMatch) {
          claim.prov_paid = parseFloat(nextMatch[1].replace(/,/g, ''));
          i++;
        }
      }
      continue;
    }

    // --- Standalone explanation codes ---
    if (/^\d{3}(\s+\d{3})*$/.test(ln)) {
      for (const code of ln.split(/\s+/)) {
        if (KNOWN_CODES.has(code)) addCode(claim, code);
      }
      continue;
    }
  }

  flush();
  return claims;
}
