import { parseDollar } from "./format";

export const STATUS_MAP = {
  paid: { label: "Paid", color: "#8aad72", icon: "✓" },
  partial: { label: "Partial", color: "#96a8c0", icon: "◐" },
  denied: { label: "Denied", color: "#c0785a", icon: "✗" },
  forwarded: { label: "Forwarded", color: "#a888b0", icon: "→" },
  reversed: { label: "Reversed", color: "#7a7060", icon: "↺" },
  pr_only: { label: "Pt Resp", color: "#c8aa64", icon: "!" },
  adjusted: { label: "Adjusted", color: "#c2703e", icon: "~" },
};

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
