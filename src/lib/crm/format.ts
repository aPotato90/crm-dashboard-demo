const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** $12,500 */
export function formatCurrency(value: number): string {
  return usd.format(value);
}

/** $12.5K, $1.2M (values under $1,000 stay exact). */
export function formatCurrencyCompact(value: number): string {
  return Math.abs(value) < 1000 ? usd.format(value) : usdCompact.format(value);
}

/** 0.6667 -> "67%" */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
