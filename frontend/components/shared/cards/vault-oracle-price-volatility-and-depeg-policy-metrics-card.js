import { fmtBps, fmtPrice } from "@/lib/vault-display-formatters";

export function VaultOraclePolicyMetricsCard({ algoMetrics }) {
  return (
    <div className="card">
      <p className="eyebrow">Oracle &amp; Policy</p>
      <h3 className="cardTitle">Live Metrics</h3>

      <div className="kpiGrid" style={{ marginTop: 12 }}>
        <div className="kpi">
          <span className="kpiLabel">Current Price</span>
          <span className="kpiValue">{fmtPrice(algoMetrics?.currentPrice)}</span>
        </div>
        <div className="kpi">
          <span className="kpiLabel">Volatility</span>
          <span className="kpiValue">{fmtBps(algoMetrics?.volatilityBps)}</span>
        </div>
        <div className="kpi">
          <span className="kpiLabel">Depeg Threshold</span>
          <span className="kpiValue">{fmtPrice(algoMetrics?.depegPrice)}</span>
        </div>
      </div>

      <table className="oracleTable">
        <thead>
          <tr>
            <th>State Trigger</th>
            <th>Volatility Threshold</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Guarded</td>
            <td>{fmtBps(algoMetrics?.guardedVolatilityBps)}</td>
          </tr>
          <tr>
            <td>Drawdown</td>
            <td>{fmtBps(algoMetrics?.drawdownVolatilityBps)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
