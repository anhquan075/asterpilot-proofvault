/// Shared display formatting helpers for vault card components.
/// toSafeNumber returns null (not 0) on invalid input so callers render "—" instead of a wrong zero.

export function toSafeNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function fmtBps(v) {
  const n = toSafeNumber(v);
  if (n === null) return "—";
  return (n / 100).toFixed(2) + "%";
}

export function fmtPrice(v) {
  const n = toSafeNumber(v);
  if (n === null) return "—";
  return "$" + (n / 1e8).toFixed(6);
}

export function fmtUsdf(raw) {
  if (raw == null) return "—";
  try {
    const n = BigInt(raw);
    const whole = n / BigInt(1e18);
    return "$" + Number(whole).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "—";
  }
}

export function getRailName(railId, isPolkadotHub, isCreditcoin) {
  if (isPolkadotHub) {
    if (railId === 1) return "Moonwell ERC4626";
    if (railId === 2) return "Moonwell Lending";
    if (railId === 3) return "BeamSwap Farm";
  }
  if (isCreditcoin) {
    if (railId === 1) return "AsterEarn (Sync)";
    if (railId === 2) return "Managed Buffer";
    if (railId === 3) return "RWA Liquidity";
  }
  // Default (BNB Chain)
  if (railId === 1) return "AsterEarn (Async)";
  if (railId === 2) return "Managed Adapter";
  if (railId === 3) return "StableSwap LP";
  return `Rail ${railId}`;
}
