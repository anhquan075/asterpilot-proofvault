import { fmtBps } from '@/lib/vault-display-formatters';

export function VaultDutchAuctionBountyCountdownCard({ auctionState }) {
  if (!auctionState) {
    return (
      <div className="card card--accent">
        <h3 className="card__title">🎯 Auction Bounty</h3>
        <p className="card__muted">Loading auction state…</p>
      </div>
    );
  }

  const { currentBountyBps, auctionElapsed, auctionRemaining, minBountyBps, maxBountyBps } = auctionState;
  const totalDuration = Number(auctionElapsed ?? 0n) + Number(auctionRemaining ?? 0n);
  const elapsed = Number(auctionElapsed ?? 0n);
  const progressPct = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;

  const formatTime = (s) => {
    if (s <= 0) return '0s';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="card card--accent">
      <h3 className="card__title">🎯 Dutch Auction Bounty</h3>

      <div className="auction__current">
        <div className="auction__bounty-value">
          {fmtBps(currentBountyBps)}
        </div>
        <div className="card__muted">Current bounty reward</div>
      </div>

      <div className="auction__progress-bar">
        <div className="auction__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="auction__stats">
        <div>
          <span className="card__muted">Min: </span>
          <span>{fmtBps(minBountyBps)}</span>
        </div>
        <div>
          <span className="card__muted">Max: </span>
          <span>{fmtBps(maxBountyBps)}</span>
        </div>
      </div>

      <div className="auction__time">
        <div>
          <span className="card__muted">Elapsed: </span>
          <span>{formatTime(elapsed)}</span>
        </div>
        <div>
          <span className="card__muted">Remaining: </span>
          <span>{formatTime(Number(auctionRemaining ?? 0n))}</span>
        </div>
      </div>
    </div>
  );
}
