#!/usr/bin/env python3
"""
Parse TriZetto/Gateway EDI Medicare Remittance View PDFs into CSV.

Handles multiple payer formats:
  - Medicare of Texas UB
  - TX Medicare Part B
  - United HealthCare / UHC
  - Blue Cross Blue Shield of Texas
  - Medicaid of Texas

Usage:
  python parse_remittance.py input.pdf
  python parse_remittance.py input.pdf -o output.csv
  python parse_remittance.py *.pdf -o combined.csv
"""

import re
import csv
import sys
import argparse
import subprocess
from pathlib import Path


# --- Constants ---

PAYER_PATTERNS = [
    (re.compile(r"Medicare of Texas UB", re.I), "Medicare of Texas UB"),
    (re.compile(r"TX MEDICARE PART B", re.I), "TX Medicare Part B"),
    (re.compile(r"United HealthCare", re.I), "United HealthCare"),
    (re.compile(r"\bUHC\b"), "UHC"),
    (re.compile(r"Blue Cross Blue Shield", re.I), "BCBS of Texas"),
    (re.compile(r"Medicaid of Texas", re.I), "Medicaid of Texas"),
]

CSV_FIELDS = [
    "patient", "member_id", "acnt", "icn", "dos", "cpt", "payer",
    "billed", "allowed", "deduct", "coins", "copay",
    "reason_codes", "prov_paid", "status_text", "rem_codes",
]

RE_PATIENT = re.compile(
    r"PATIENT\s+NAME:\s+(.+?)\s{2,}MEMBER\s+IDENTIFICATION:\s+(\S+)"
    r"\s+ACNT\s+(\S+)\s+ICN\s+(\S+)"
)
RE_DOLLAR = re.compile(r"\(?\$[\d,]+\.?\d*\)?")
RE_DATE = re.compile(r"\b(\d{1,2}/\d{1,2}/\d{4})\b")
RE_CPT = re.compile(r"\b(\d{5}|[A-Z]\d{4})\b")
RE_REASON = re.compile(r"\b((?:PR|CO|OA|PI|CR)-[A-Z]?\d+)\b")
RE_REMARK = re.compile(r"\b(N\d{1,4})\b")


def parse_dollar(s):
    """Parse dollar string to float. ($3.95) → -3.95"""
    if not s:
        return 0.0
    s = s.strip().replace(",", "")
    neg = "(" in s and ")" in s
    s = re.sub(r"[$()\s]", "", s).replace("−", "-")
    try:
        val = float(s)
        return -val if neg else val
    except ValueError:
        return 0.0


def extract_dollars(line):
    """Extract all dollar amounts from a line in order."""
    return [parse_dollar(m) for m in RE_DOLLAR.findall(line)]


def extract_text(pdf_path):
    """Extract text via pdftotext with layout."""
    result = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"pdftotext failed: {result.stderr}")
    return result.stdout


def detect_payer(line):
    """Return payer name if line is a payer section header, else None."""
    stripped = line.strip()
    if len(stripped) > 100 or "PATIENT" in stripped:
        return None
    for pat, name in PAYER_PATTERNS:
        if pat.search(stripped):
            return name
    return None


def is_section_totals(line):
    """Detect section-level TOTALS (has claim count before first $)."""
    m = re.match(r"\s*TOTALS:\s+(\d+)\s+\$", line)
    return m is not None


def is_claim_totals(line):
    """Detect claim-level TOTALS ($ immediately after TOTALS:)."""
    return bool(re.match(r"\s*TOTALS:\s+\(?\$", line))


def is_skip_line(line):
    """Lines to ignore entirely."""
    s = line.strip()
    if not s:
        return True
    if s.startswith("\f"):
        return True
    if "TriZetto Provider Solutions" in s:
        return True
    if re.match(r"https?://", s):
        return True
    if re.match(r"\d+/\d+\s*$", s):
        return True
    if re.match(r"\s*(NPI/|PROVIDER\s+#|EFT\s+#|Check\s+#|Non-payment\s+#|SITE\s+\d)", s):
        return True
    if re.match(r"\s*(Prov\.\s|Begin/End|ID\s+Date\s+Units|Claims\s+Billed|\(CoPay\)\s+Red)", s):
        return True
    if re.match(r"\s*Resp\.\s+Filing|^\s*Adj\.\s+Codes", s):
        return True
    return False


def parse_claims(text):
    """Parse remittance text into claim dicts."""
    lines = text.split("\n")
    claims = []
    current_payer = ""
    in_glossary = False
    in_prov_adj = False
    claim = None

    def flush():
        nonlocal claim
        if claim and claim.get("patient"):
            claims.append(claim)
        claim = None

    def add_reasons(new_codes):
        """Add reason codes to current claim without duplicates."""
        if not claim or not new_codes:
            return
        existing = set(claim["reason_codes"].split())
        added = [c for c in new_codes if c not in existing]
        if added:
            claim["reason_codes"] = (claim["reason_codes"] + " " + " ".join(added)).strip()

    def add_remarks(new_codes):
        """Add remark codes to current claim without duplicates."""
        if not claim or not new_codes:
            return
        existing = set(claim["rem_codes"].split())
        added = [c for c in new_codes if c not in existing]
        if added:
            claim["rem_codes"] = (claim["rem_codes"] + " " + " ".join(added)).strip()

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if is_skip_line(line):
            i += 1
            continue

        # --- Payer header ---
        payer = detect_payer(stripped)
        if payer:
            current_payer = payer
            in_glossary = False
            in_prov_adj = False
            i += 1
            continue

        # --- Glossary / Provider Adj sections (skip) ---
        if "GLOSSARY:" in stripped:
            in_glossary = True
            i += 1
            continue
        if "Provider Adjustment Detail" in stripped:
            in_prov_adj = True
            i += 1
            continue
        if in_glossary or in_prov_adj:
            if "PATIENT NAME:" in stripped:
                in_glossary = False
                in_prov_adj = False
            elif payer:
                in_glossary = False
                in_prov_adj = False
            else:
                i += 1
                continue

        # --- Section totals (skip) ---
        if is_section_totals(stripped):
            i += 1
            continue

        # --- New patient block ---
        patient_match = RE_PATIENT.search(stripped)
        if patient_match:
            flush()
            icn = patient_match.group(4).strip()
            # Clean trailing "ASG" or other artifacts from ICN
            icn = re.sub(r"\s*(ASG|Y)\s*$", "", icn).strip()

            claim = {
                "patient": patient_match.group(1).strip(),
                "member_id": patient_match.group(2).strip(),
                "acnt": patient_match.group(3).strip(),
                "icn": icn,
                "payer": current_payer,
                "dos": "",
                "cpt": "",
                "billed": 0.0,
                "allowed": 0.0,
                "deduct": 0.0,
                "coins": 0.0,
                "copay": 0.0,
                "reason_codes": "",
                "prov_paid": 0.0,
                "status_text": "",
                "rem_codes": "",
            }
            i += 1
            continue

        if claim is None:
            i += 1
            continue

        # --- Status / Payment line ---
        # Handle multiline: "... Claim Payment Amount:\n($3.95) ..."
        status_patterns = [
            r"(Denied)\s+Claim\s+Payment\s+Amount:\s*",
            r"(Processed as (?:Primary|Secondary)(?:,\s*Forwarded.+?)?)\s*Claim\s+Payment\s+Amount:\s*",
            r"(Reversal of Previous Payment)\s+Claim\s+Payment\s+Amount:\s*",
        ]

        for sp in status_patterns:
            m = re.search(sp, stripped)
            if m:
                claim["status_text"] = m.group(1).strip()
                # Try to find payment amount on this line
                after_match = stripped[m.end():]
                dollars = RE_DOLLAR.findall(after_match)
                if dollars:
                    claim["prov_paid"] = parse_dollar(dollars[0])
                else:
                    # Payment amount is on next line
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        dollars = RE_DOLLAR.findall(next_line)
                        if dollars:
                            claim["prov_paid"] = parse_dollar(dollars[0])
                            i += 1  # consume next line
                break

        if m:
            i += 1
            continue

        # --- INSURED NAME (skip) ---
        if stripped.startswith("INSURED NAME:"):
            i += 1
            continue

        # --- PT GRP / reason code lines ---
        if stripped.startswith("PT GRP") or stripped.startswith("ASG"):
            add_reasons(RE_REASON.findall(stripped))
            i += 1
            continue

        # --- Standalone reason code line (Medicaid: "CO-22,") ---
        if re.match(r"^\s*[A-Z]{1,2}-[A-Z]?\d+[,;]?\s*$", stripped):
            code = stripped.rstrip(",; ")
            add_reasons([code])
            i += 1
            continue

        # --- Claim TOTALS line ---
        if is_claim_totals(stripped):
            dollars = extract_dollars(stripped)
            if len(dollars) >= 2:
                claim["billed"] = dollars[0]
                claim["allowed"] = dollars[1]
            if len(dollars) >= 3:
                claim["deduct"] = dollars[2]
            if len(dollars) >= 4:
                claim["coins"] = dollars[3]
            if len(dollars) >= 5:
                claim["copay"] = dollars[4]
            i += 1
            continue

        # --- Data line with date + amounts (service line) ---
        dates = RE_DATE.findall(stripped)
        dollars_on_line = RE_DOLLAR.findall(stripped)

        if dates and dollars_on_line:
            if not claim["dos"]:
                claim["dos"] = dates[0]

            # Extract CPT - skip revenue codes starting with 0
            cpts = RE_CPT.findall(stripped)
            real_cpts = [c for c in cpts
                         if not c.startswith("0")
                         and c not in dates[0].replace("/", "")]
            if real_cpts and not claim["cpt"]:
                claim["cpt"] = real_cpts[0]

            # Reason + remark codes from data line
            add_reasons(RE_REASON.findall(stripped))
            add_remarks(RE_REMARK.findall(stripped))
            i += 1
            continue

        # --- Date-only line (second date line, no dollars) ---
        if dates and not dollars_on_line:
            # Still try to extract CPT from this line
            cpts = RE_CPT.findall(stripped)
            real_cpts = [c for c in cpts
                         if not c.startswith("0")
                         and c not in dates[0].replace("/", "")]
            if real_cpts and not claim["cpt"]:
                claim["cpt"] = real_cpts[0]
            i += 1
            continue

        # --- Continuation: CPT code on its own line ---
        cpt_match = re.match(r"^\s*(\d{5}|[A-Z]\d{4})[,\s]", stripped)
        if cpt_match and not claim["cpt"]:
            code = cpt_match.group(1)
            if not code.startswith("0"):
                claim["cpt"] = code
            i += 1
            continue

        # --- Continuation: modifiers or more reason/remark codes ---
        add_reasons(RE_REASON.findall(stripped))
        add_remarks(RE_REMARK.findall(stripped))

        i += 1

    flush()
    return claims


def write_csv(claims, output_path):
    """Write claims to CSV."""
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for c in claims:
            row = {k: c.get(k, "") for k in CSV_FIELDS}
            for col in ["billed", "allowed", "deduct", "coins", "copay", "prov_paid"]:
                val = row[col]
                if isinstance(val, (int, float)):
                    row[col] = f"{val:.2f}" if val != 0 else "0.00"
            writer.writerow(row)


def main():
    parser = argparse.ArgumentParser(description="Parse TriZetto ERA/EOB PDFs to CSV")
    parser.add_argument("pdfs", nargs="+", help="PDF file(s) to parse")
    parser.add_argument("-o", "--output", help="Output CSV path")
    args = parser.parse_args()

    all_claims = []
    for pdf_path in args.pdfs:
        path = Path(pdf_path)
        if not path.exists():
            print(f"File not found: {pdf_path}", file=sys.stderr)
            continue
        print(f"Parsing {path.name}...", file=sys.stderr)
        text = extract_text(path)
        claims = parse_claims(text)
        all_claims.extend(claims)
        print(f"  {len(claims)} claims extracted", file=sys.stderr)

    if not all_claims:
        print("No claims found.", file=sys.stderr)
        sys.exit(1)

    output = args.output or f"{Path(args.pdfs[0]).stem}_parsed.csv"
    write_csv(all_claims, output)
    print(f"\nWrote {len(all_claims)} claims to {output}", file=sys.stderr)


if __name__ == "__main__":
    main()
