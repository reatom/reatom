// `Date.now() * 1e6` (~1.76e18) overflows Number.MAX_SAFE_INTEGER (~9e15);
// BigInt keeps integer ms exact, fractional ms folds in via rounding.
export const msToNano = (ms: number): string => {
  const truncMs = Math.trunc(ms)
  const fracNs = Math.round((ms - truncMs) * 1_000_000)
  return (BigInt(truncMs) * 1_000_000n + BigInt(fracNs)).toString()
}
