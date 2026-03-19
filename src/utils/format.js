/**
 * Parse a dollar string to a number.
 * Handles "$1,234.56", "($50.00)", parentheses for negatives, etc.
 */
export function parseDollar(n) {
  if (n === null || n === undefined) return 0;
  const str = n.toString().replace(/[$,]/g, "");
  // Handle parenthesized negatives: ($3.95) -> -3.95
  const match = str.match(/^\((.+)\)$/);
  if (match) return -(parseFloat(match[1]) || 0);
  return parseFloat(str) || 0;
}

/**
 * Format a number as a dollar string.
 * Negative values shown as ($X.XX).
 */
export function formatDollar(n) {
  const v = Number(n || 0);
  const s = Math.abs(v)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return v < 0 ? `($${s})` : `$${s}`;
}
