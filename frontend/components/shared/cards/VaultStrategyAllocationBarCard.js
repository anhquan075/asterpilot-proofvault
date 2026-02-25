import { toSafeNumber, fmtBps, fmtUsdf } from "@/lib/vaultDisplayFormatters";
import { formatUnits } from "ethers";

export function VaultStrategyAllocationBarCard({ asterManagedAssets, secondaryManagedAssets, lpManagedAssets, lpStakingInfo, totalAssetsRaw, algoMetrics, harvestGasEstimate, harvestGasMultiplier }) {
  const total = toSafeNumber(totalAssetsRaw) ?? 0;
  const aster = toSafeNumber(asterManagedAssets) ?? 0;
  const lp = toSafeNumber(lpManagedAssets) ?? 0;

  const asterPct = total > 0 ? Math.round((aster / total) * 100) : 0;
  const lpPct = total > 0 ? Math.round((lp / total) * 100) : 0;
  const secondaryPct = Math.max(0, 100 - asterPct - lpPct);

  return (
    <div className="card">
      <p className="eyebrow">Strategy Allocation</p>
      <h3 className="cardTitle">Capital Distribution</h3>

      <div className="allocationBar">
        <div
          className="allocationSegment allocationSegment--aster"
          style={{ width: `${asterPct}%` }}
          title={`AsterDEX ${asterPct}%`}
        />
        <div
          className="allocationSegment allocationSegment--lp"
          style={{ width: `${lpPct}%` }}
          title={`StableSwap LP ${lpPct}%`}
        />
        <div
          className="allocationSegment allocationSegment--secondary"
          style={{ width: `${secondaryPct}%` }}
          title={`Buffer ${secondaryPct}%`}
        />
      </div>
      <div className="allocationLegend">
        <span className="allocationLegendItem allocationLegendItem--aster">AsterDEX {asterPct}%</span>
        <span className="allocationLegendItem allocationLegendItem--lp">StableSwap LP {lpPct}%</span>
        <span className="allocationLegendItem allocationLegendItem--secondary">Buffer {secondaryPct}%</span>
      </div>

      <table className="oracleTable">
        <thead>
          <tr>
            <th>Protocol</th>
            <th>AUM</th>
            <th>Staked</th>
            <th>Unstaked</th>
            <th>Rewards</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>AsterDEX</td>
            <td>{fmtUsdf(asterManagedAssets)}</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          </tr>
          <tr>
            <td>StableSwap LP</td>
            <td>{fmtUsdf(lpManagedAssets)}</td>
            <td>
              {lpStakingInfo && lpStakingInfo.staked > 0n
                ? fmtUsdf(lpStakingInfo.staked)
                : "—"}
            </td>
            <td>
              {lpStakingInfo && lpStakingInfo.unstaked > 0n
                ? fmtUsdf(lpStakingInfo.unstaked)
                : "—"}
            </td>
            <td>
              {lpStakingInfo && lpStakingInfo.pending > 0n
                ? `${parseFloat(formatUnits(lpStakingInfo.pending, 18)).toFixed(4)} CAKE`
                : "—"}
            </td>
          </tr>
          <tr>
            <td>Buffer</td>
            <td>{fmtUsdf(secondaryManagedAssets)}</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      {algoMetrics && (
        <table className="oracleTable" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Target Allocation</th>
              <th>Normal</th>
              <th>Guarded</th>
              <th>Drawdown</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>AsterDEX Target BPS</td>
              <td>{fmtBps(algoMetrics?.normalAsterBps)}</td>
              <td>{fmtBps(algoMetrics?.guardedAsterBps)}</td>
              <td>{fmtBps(algoMetrics?.drawdownAsterBps)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Gas-gated harvest status row — shows when farm adapter has gas params configured */}
      {(harvestGasEstimate != null || harvestGasMultiplier != null) && (
        <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(74,222,128,.05)', borderRadius: 6, border: '1px solid rgba(74,222,128,.10)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Auto-Harvest</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Gas-gated at {harvestGasEstimate != null ? harvestGasEstimate.toLocaleString() : '?'} gas × {harvestGasMultiplier ?? '?'}× multiplier
          </span>
        </div>
      )}
    </div>
  );
}
