/**
 * excelParser.js — Parses Excel (.xlsx/.xls) remittance files
 * Lazy-loaded via dynamic import in App.jsx (same pattern as pdfParser)
 * Requires: npm install xlsx --ignore-scripts
 */

export async function parseExcel(file) {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find the header row (contains "Patient Name" or similar)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c).trim().toLowerCase());
    if (row.some(c => c.includes('patient') && c.includes('name'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Could not find header row in Excel file. Expected a "Patient Name" column.');
  }

  const headers = rows[headerIndex].map(h => String(h).trim());

  // Map header names to indices (flexible matching)
  const colMap = {};
  headers.forEach((h, i) => {
    const lc = h.toLowerCase();
    if (lc.includes('patient') && lc.includes('name')) colMap.patientName = i;
    else if (lc.includes('member') && lc.includes('id')) colMap.memberId = i;
    else if (lc.includes('account') || lc.includes('pcn')) colMap.accountNumber = i;
    else if (lc.includes('date of service') || lc === 'dos' || (lc.includes('begin') && lc.includes('service'))) colMap.dos = i;
    else if (lc.includes('end') && lc.includes('service')) colMap.dosEnd = i;
    else if (lc === 'payer' || lc.includes('payer')) colMap.payer = i;
    else if (lc.includes('billed')) colMap.billed = i;
    else if (lc.includes('allowed')) colMap.allowed = i;
    else if (lc.includes('payment') || lc.includes('prov') && lc.includes('paid')) colMap.paid = i;
    else if (lc.includes('adj')) colMap.adjustment = i;
    else if (lc === 'status') colMap.status = i;
    else if (lc.includes('reason') && !lc.includes('code')) colMap.reason = i;
    else if (lc.includes('denial') && lc.includes('code')) colMap.denialCode = i;
    else if (lc.includes('letter') && lc.includes('date')) colMap.letterDate = i;
    else if (lc.includes('deduct')) colMap.deductible = i;
    else if (lc.includes('coins')) colMap.coinsurance = i;
    else if (lc.includes('copay') || (lc.includes('pt') && lc.includes('resp'))) colMap.copay = i;
  });

  if (colMap.patientName === undefined) {
    throw new Error('Could not map "Patient Name" column in Excel file.');
  }

  const claims = [];
  const dataRows = rows.slice(headerIndex + 1);

  for (const row of dataRows) {
    const name = String(row[colMap.patientName] ?? '').trim();

    // Skip empty rows and TOTALS row
    if (!name || name.toUpperCase() === 'TOTALS') continue;

    const billed = parseDollar(row[colMap.billed]);
    const paid = parseDollar(row[colMap.paid]);
    const allowed = colMap.allowed !== undefined ? parseDollar(row[colMap.allowed]) : 0;
    const adjustment = colMap.adjustment !== undefined ? parseDollar(row[colMap.adjustment]) : 0;

    const rawStatus = String(row[colMap.status] ?? '').trim();
    const rawReason = String(row[colMap.reason] ?? '').trim();
    const rawDenialCode = colMap.denialCode !== undefined ? String(row[colMap.denialCode] ?? '').trim() : '';

    // Build reason code — prefer explicit denial code, else extract from reason text
    let reasonCode = rawDenialCode;
    if (!reasonCode) {
      const carcMatch = rawReason.match(/CARC\s*(\d+)/i);
      if (carcMatch) reasonCode = carcMatch[1];
    }

    // Derive denial code string for the app
    const denialCode = reasonCode
      ? (rawReason || `CARC ${reasonCode}`)
      : (rawReason || rawStatus);

    const dosRaw = row[colMap.dos] ?? '';
    const dos = formatDate(dosRaw);
    const dosEnd = colMap.dosEnd !== undefined ? formatDate(row[colMap.dosEnd]) : dos;

    claims.push({
      patientName: name,
      memberId: String(row[colMap.memberId] ?? '').trim(),
      accountNumber: String(row[colMap.accountNumber] ?? '').trim(),
      dos,
      dosEnd,
      payer: String(row[colMap.payer] ?? '').trim(),
      billed,
      allowed,
      paid,
      adjustment,
      status: rawStatus,
      reason: rawReason,
      denialCode,
      reasonCode,
    });
  }

  if (claims.length === 0) {
    throw new Error('No claims found in Excel file. Check the file format.');
  }

  return claims;
}

/** Parse a value that might be a number or dollar string into a number */
function parseDollar(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Normalize a date value (could be JS Date, string, or number) to MM/DD/YYYY */
function formatDate(val) {
  if (!val) return '';
  // If it's already a string like "02/06/2026", return as-is
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) {
    return val.trim();
  }
  // Try parsing as Date
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }
  return String(val).trim();
}
