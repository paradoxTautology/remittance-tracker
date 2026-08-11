import { parseDollar } from "./format";

export const STATUS_MAP = {
  paid: { label: "Paid", color: "#6db856", icon: "✓" },
  partial: { label: "Partial", color: "#5b9bd5", icon: "◐" },
  denied: { label: "Denied", color: "#d4604a", icon: "✗" },
  forwarded: { label: "Forwarded", color: "#b07cc8", icon: "→" },
  reversed: { label: "Reversed", color: "#8a8078", icon: "↺" },
  pr_only: { label: "Pt Resp", color: "#d4a838", icon: "!" },
  adjusted: { label: "Adjusted", color: "#c2703e", icon: "~" },
  // ---- Lifecycle statuses (pre-remittance) ----
  submitted: { label: "Submitted", color: "#56a89f", icon: "↑" },
  ch_rejected: { label: "CH Reject", color: "#b5543b", icon: "⊘" },
  payer_rejected: { label: "Payer Reject", color: "#c94f6d", icon: "⊘" },
  excluded: { label: "Never Sent", color: "#d9913a", icon: "∅" },
  other_batch: { label: "Other Batch", color: "#7d99a8", icon: "»" },
};

// Statuses derived from remittance data (money truth — never overwritten by lifecycle imports)
export const REMIT_STATUSES = [
  "paid",
  "partial",
  "denied",
  "forwarded",
  "reversed",
  "pr_only",
  "adjusted",
];

// Statuses set by batch / rejection imports (pre-remittance lifecycle)
export const LIFECYCLE_STATUSES = [
  "submitted",
  "ch_rejected",
  "payer_rejected",
  "excluded",
  "other_batch",
];

export function isRemitStatus(s) {
  return REMIT_STATUSES.includes(s);
}

export function isLifecycleStatus(s) {
  return LIFECYCLE_STATUSES.includes(s);
}

/**
 * Precedence rule for lifecycle imports:
 *  - A remittance-derived status is the money truth → lifecycle imports never overwrite it.
 *  - Among lifecycle statuses, the newest import wins (submitted → rejected → resubmitted → …).
 *  - A brand-new claim (no status yet) always accepts a lifecycle status.
 */
export function canApplyLifecycle(currentStatus) {
  return !isRemitStatus(currentStatus);
}

/** Map a rejectionParser record → status key. */
export function deriveRejectionStatus(record) {
  return record.rejectionType === "payer" ? "payer_rejected" : "ch_rejected";
}

/**
 * Map a batchParser row → status key.
 * zeroBalance rows return null (already paid — nothing to track).
 */
export function deriveBatchStatus(row) {
  switch (row.classification) {
    case "submitted":
      return "submitted";
    case "excluded":
      return "excluded";
    case "otherBatch":
      return "other_batch";
    default:
      return null; // zeroBalance → skip
  }
}

/**
 * Derive a claim status from reason codes and payment fields.
 *
 * Logic priority:
 *  1. Negative billed/paid → reversed
 *  2. PR-24 / PR-27 / PR-119 with $0 paid → denied (capitation, terminated, benefit max)
 *  3. CO-B11 / CO-B9 with $0 paid → forwarded (misrouted / hospice)
 *  4. CO-22 / CO-16 / CO-252 / CO-31 / OA-18 with $0 paid + $0 allowed → denied
 *  5. $0 paid + PR-1/2/3 + allowed > 0 → patient responsibility only
 *  6. $0 paid otherwise → denied
 *  7. Paid >= 90% of allowed → paid
 *  8. Paid > 0 but < 90% → partial
 *  9. Fallback → adjusted
 */
export function deriveStatus(claim) {
  const paid = parseDollar(claim.prov_paid);
  const billed = parseDollar(claim.billed);
  const allowed = parseDollar(claim.allowed);
  const reason = (claim.reason_codes || "").toUpperCase();

  if (paid < 0 || billed < 0) return "reversed";

  if (/PR-24|PR-27|PR-119/.test(reason) && paid === 0) return "denied";

  if (/CO-B11|CO-B9/.test(reason) && paid === 0) return "forwarded";

  if (
    /CO-22|CO-16|CO-252|CO-31|OA-18/.test(reason) &&
    paid === 0 &&
    allowed === 0
  )
    return "denied";

  if (paid === 0 && billed > 0) {
    if (/PR-1|PR-2|PR-3/.test(reason) && allowed > 0) return "pr_only";
    return "denied";
  }

  if (paid > 0 && allowed > 0 && paid >= allowed * 0.9) return "paid";
  if (paid > 0) return "partial";

  return "adjusted";
}
