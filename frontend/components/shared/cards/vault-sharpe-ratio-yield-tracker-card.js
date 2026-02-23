import { TrendingUp } from 'lucide-react';

export function VaultSharpeRatioYieldTrackerCard({ sharpeState }) {
  if (!sharpeState) {
    return (
      <div className="card card--accent">
        <h3 className="card__title"><TrendingUp size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} />Sharpe Ratio</h3>
        <p className="card__muted">Loading Sharpe data…</p>
      </div>
    );
  }

  const { meanYieldBps, volatility, sharpe, observationCount } = sharpeState;

  const sharpeNum = Number(sharpe);
  const sharpeDisplay = (sharpeNum / 10000).toFixed(2);
  const meanDisplay = (Number(meanYieldBps) / 100).toFixed(2);
  const volDisplay = (Number(volatility) / 100).toFixed(2);

  let sharpeColor = 'sharpe--neutral';
  if (observationCount >= 3) {
    if (sharpeNum >= 10000) sharpeColor = 'sharpe--good';
    else if (sharpeNum >= 5000) sharpeColor = 'sharpe--moderate';
    else sharpeColor = 'sharpe--poor';
  }

  return (
    <div className="card card--accent">
      <h3 className="card__title"><TrendingUp size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} />Sharpe Ratio</h3>

      <div className={`sharpe__value ${sharpeColor}`}>
        {observationCount >= 3 ? sharpeDisplay : '—'}
      </div>
      <div className="card__muted" style={{ textAlign: 'center', marginBottom: 12 }}>
        {observationCount >= 3
          ? `Risk-adjusted return (${observationCount} cycles)`
          : `Need ${3 - Number(observationCount)} more cycles for Sharpe calculation`}
      </div>

      <div className="sharpe__stats">
        <div className="sharpe__stat">
          <div className="card__muted">Mean Yield</div>
          <div>{observationCount >= 3 ? `${meanDisplay}%` : '—'}</div>
        </div>
        <div className="sharpe__stat">
          <div className="card__muted">Volatility</div>
          <div>{observationCount >= 3 ? `${volDisplay}%` : '—'}</div>
        </div>
        <div className="sharpe__stat">
          <div className="card__muted">Observations</div>
          <div>{String(observationCount)}</div>
        </div>
      </div>
    </div>
  );
}
