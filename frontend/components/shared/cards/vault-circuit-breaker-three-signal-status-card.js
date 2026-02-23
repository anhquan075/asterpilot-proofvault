import { fmtBps } from '@/lib/vault-display-formatters';

export function VaultCircuitBreakerThreeSignalStatusCard({ breakerState, auctionState }) {
  const { paused, signalA, signalB, signalC, lastTripTimestamp, recoveryTimestamp } = breakerState ?? {};
  const now = Math.floor(Date.now() / 1000);
  const recoveryIn = paused && recoveryTimestamp > now ? recoveryTimestamp - now : 0;

  const { currentBountyBps, auctionElapsed, auctionRemaining, minBountyBps, maxBountyBps } = auctionState ?? {};
  const totalDuration = Number(auctionElapsed ?? 0n) + Number(auctionRemaining ?? 0n);
  const elapsed = Number(auctionElapsed ?? 0n);
  const progressPct = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;

  const formatTime = (s) => {
    if (s <= 0) return '0s';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const signalIndicator = (label, active, description) => (
    <div className="breaker__signal" key={label}>
      <span className={`breaker__dot ${active ? 'breaker__dot--tripped' : 'breaker__dot--clear'}`} />
      <div>
        <strong>{label}</strong>
        <div className="card__muted" style={{ fontSize: '0.85em' }}>{description}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* Left column: Circuit Breaker */}
      <div className={`card ${paused ? 'card--danger' : 'card--accent'}`} style={{ borderRadius: '4px' }}>
        <h3 className="card__title" style={{ textAlign: 'center', marginBottom: 16 }}>Circuit Breaker</h3>

        <div className="breaker__banner" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '12px 14px', borderRadius: '4px',
          background: paused ? 'rgba(255,65,65,.08)' : 'rgba(200, 147, 90, .08)',
          border: paused ? '1px solid rgba(255,65,65,.2)' : '1px solid rgba(200, 147, 90, .2)',
          ...(paused ? { color: 'var(--danger)' } : {})
        }}>
          <span className={`breaker__dot ${paused ? 'breaker__dot--tripped' : 'breaker__dot--clear'}`} />
          <span style={{ fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
            {paused
              ? `Vault paused${recoveryIn > 0 ? ` — ${Math.floor(recoveryIn / 60)}m ${recoveryIn % 60}s` : ''}`
              : 'All signals clear — Vault operational'
            }
          </span>
        </div>

        <div className="breaker__signals" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {signalIndicator('Signal A', signalA, 'Chainlink USDT/USD deviation')}
          {signalIndicator('Signal B', signalB, 'StableSwap reserve ratio')}
          {signalIndicator('Signal C', signalC, 'Virtual price drop')}
        </div>

        {lastTripTimestamp > 0 && (
          <div className="card__muted" style={{ marginTop: 12, fontSize: '0.8em', textAlign: 'center' }}>
            Last trip: {new Date(Number(lastTripTimestamp) * 1000).toLocaleString()}
          </div>
        )}
      </div>

      {/* Right column: Dutch Auction Bounty */}
      <div className="card card--accent" style={{ borderRadius: '4px' }}>
        <h3 className="card__title" style={{ textAlign: 'center', marginBottom: 16 }}>Dutch Auction Bounty</h3>

        {auctionState ? (
          <>
            <div className="auction__current">
              <div className="auction__bounty-value">{fmtBps(currentBountyBps)}</div>
              <div className="card__muted">Current bounty reward</div>
            </div>

            <div className="auction__progress-bar">
              <div className="auction__progress-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="auction__stats">
              <div><span className="card__muted">Min: </span><span>{fmtBps(minBountyBps)}</span></div>
              <div><span className="card__muted">Max: </span><span>{fmtBps(maxBountyBps)}</span></div>
            </div>

            <div className="auction__time">
              <div><span className="card__muted">Elapsed: </span><span>{formatTime(elapsed)}</span></div>
              <div><span className="card__muted">Remaining: </span><span>{formatTime(Number(auctionRemaining ?? 0n))}</span></div>
            </div>
          </>
        ) : (
          <p className="card__muted">Loading auction state…</p>
        )}
      </div>

    </div>
  );
}
