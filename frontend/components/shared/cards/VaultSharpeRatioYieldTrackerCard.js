import { TrendingUp } from 'lucide-react';

export function VaultSharpeRatioYieldTrackerCard({ sharpeState }) {
  if (!sharpeState) {
    return (
      <div className="card card--accent" style={{ display:'flex', flexDirection:'column' }}>
        <h3 className="card__title" style={{ marginBottom: 8 }}><TrendingUp size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} />Sharpe Ratio</h3>
        <div className="skeleton" style={{ width: '60%', height: 32, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '80%', height: 12, borderRadius: 4 }} />
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
    <div className="card card--accent" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 28 }}>
      <h3 className="card__title"><TrendingUp size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} />Sharpe Ratio</h3>

      <div className={`sharpe__value ${sharpeColor}`} style={{ flexShrink: 0 }}>
        {observationCount >= 3 ? sharpeDisplay : '—'}
      </div>
      <div className="card__muted" style={{ textAlign: 'center', marginBottom: 16, fontSize: '0.85em', wordBreak: 'break-word', whiteSpace: 'normal', flexShrink: 0 }}>
        {observationCount >= 3
          ? `Risk-adjusted return (${observationCount} cycles)`
          : `Need ${3 - Number(observationCount)} more cycles`}
      </div>

      <div className="sharpe__stats" style={{ marginTop: 'auto', paddingTop: 12, marginBottom: 4 }}>
        <div className="sharpe__stat">
          <div className="card__muted" style={{ marginBottom: 4 }}>Mean Yield</div>
          <div style={{ fontWeight: 'bold' }}>{observationCount >= 3 ? `${meanDisplay}%` : '—'}</div>
        </div>
        <div className="sharpe__stat">
          <div className="card__muted" style={{ marginBottom: 4 }}>Volatility</div>
          <div style={{ fontWeight: 'bold' }}>{observationCount >= 3 ? `${volDisplay}%` : '—'}</div>
        </div>
        <div className="sharpe__stat">
          <div className="card__muted" style={{ marginBottom: 4 }}>Obs.</div>
          <div style={{ fontWeight: 'bold' }}>{String(observationCount)}</div>
        </div>
      </div>
    </div>
  );
}
