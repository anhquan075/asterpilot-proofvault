import { useEffect, useState } from "react";

const BSCSCAN = "https://bscscan.com/tx/";

function shortHash(hash) {
  if (!hash) return null;
  return hash.slice(0, 10) + "…" + hash.slice(-6);
}

function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return iso; }
}

export function VaultTransactionHistoryCard({ txHistory }) {
  const [pushTx, setPushTx] = useState(null);
  const latestTx = txHistory?.[0] ?? null;
  const latestTxId = latestTx?.id;

  useEffect(() => {
    if (!latestTxId) {
      setPushTx(null);
      return;
    }
    setPushTx(latestTx);
    const timer = setTimeout(() => setPushTx(null), 5000);
    return () => clearTimeout(timer);
  }, [latestTxId, latestTx]);

  if (!txHistory?.length) {
    return (
      <div className="card">
        <p className="eyebrow">Transaction History</p>
        <h3 className="cardTitle">Recent Activity</h3>
        <p className="txEmpty">No transactions yet this session.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="eyebrow">Transaction History</p>
      <h3 className="cardTitle">Recent Activity</h3>

      {pushTx && (
        <div className={`txPush txPush--${pushTx.outcome}`} role="status" aria-live="polite">
          <div className="txPushTop">
            <span className="txPushLabel">New Notification</span>
            <span className="txPushOutcome">{pushTx.outcome}</span>
          </div>
          <div className="txPushBody">
            <span>{pushTx.action}</span>
            {pushTx.hash
              ? <a href={`${BSCSCAN}${pushTx.hash}`} target="_blank" rel="noopener noreferrer">{shortHash(pushTx.hash)} ↗</a>
              : <span>pending details</span>}
          </div>
        </div>
      )}

      <ul className="txList">
        {txHistory.map(tx => (
          <li key={tx.id} className="txItem">
            <div className="txTop">
              <span className="txAction">{tx.action}</span>
              <span className={`txOutcome txOutcome--${tx.outcome}`}>{tx.outcome}</span>
            </div>
            <div className="txMeta">
              <span>{fmtTime(tx.at)}</span>
              {tx.hash
                ? <a href={`${BSCSCAN}${tx.hash}`} target="_blank" rel="noopener noreferrer">
                    {shortHash(tx.hash)} ↗ BscScan
                  </a>
                : <span style={{ color: "#ef4444", fontSize: 11 }}>no hash</span>
              }
            </div>
            {tx.note && tx.outcome === "failed" && (
              <p className="txNote">{tx.note}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
