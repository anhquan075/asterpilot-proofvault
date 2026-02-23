import { useCallback, useEffect, useState } from "react";
import { executionAuctionAbi, erc20Abi } from "@/lib/abi";
import { fmtUsdf } from "@/lib/vault-display-formatters";

const PHASE_LABELS = ["NotOpen", "BidPhase", "ExecutePhase", "FallbackPhase"];
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function shortAddr(addr) {
  if (!addr || addr === ZERO_ADDR) return "none";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function fmtSeconds(secs) {
  if (!secs || secs <= 0) return "0s";
  const n = Number(secs);
  const m = Math.floor(n / 60);
  const s = n % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function VaultExecutionAuctionRraBidCard({
  executionAuctionAddress,
  tokenAddress,
  signer,
  walletAddress,
  canOperate,
  busyAction,
  onBusyChange,
  onStatus,
}) {
  const [roundStatus, setRoundStatus] = useState(null);
  const [auctionStats, setAuctionStats] = useState(null);
  const [pendingRefund, setPendingRefund] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    if (!executionAuctionAddress) return;
    try {
      const ethersLib = await import("ethers");
      const provider = signer ?? null;
      if (!provider) return;
      const auction = new ethersLib.Contract(
        ethersLib.getAddress(executionAuctionAddress),
        executionAuctionAbi,
        provider
      );
      const [status, stats] = await Promise.all([
        auction.roundStatus().catch(() => null),
        auction.stats().catch(() => null),
      ]);
      if (status) {
        setRoundStatus({
          id: status.id,
          currentPhase: Number(status.currentPhase),
          winner: status.winner,
          winningBid: status.winningBid,
          bidTimeRemaining: status.bidTimeRemaining,
          executeTimeRemaining: status.executeTimeRemaining,
        });
      }
      if (stats) {
        setAuctionStats({
          totalRounds: stats.totalRounds,
          bidRevenue: stats.bidRevenue,
          currentPhase: Number(stats.currentPhase_),
        });
      }
      if (walletAddress) {
        const refund = await auction.pendingRefunds(walletAddress).catch(() => null);
        setPendingRefund(refund);
      }
    } catch {
      // silent — no provider yet
    }
  }, [executionAuctionAddress, signer, walletAddress]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 15000);
    return () => clearInterval(id);
  }, [fetchState]);

  const handleBid = useCallback(async () => {
    if (!signer || !executionAuctionAddress || !bidAmount) return;
    onBusyChange?.("auction-bid");
    setLoading(true);
    try {
      const ethersLib = await import("ethers");
      const auction = new ethersLib.Contract(
        ethersLib.getAddress(executionAuctionAddress),
        executionAuctionAbi,
        signer
      );
      const decimals = 18n;
      const amount = ethersLib.parseUnits(bidAmount, decimals);

      if (tokenAddress) {
        const token = new ethersLib.Contract(
          ethersLib.getAddress(tokenAddress),
          erc20Abi,
          signer
        );
        onStatus?.("Approving bid token...");
        const approveTx = await token.approve(executionAuctionAddress, amount);
        await approveTx.wait();
      }

      onStatus?.("Placing bid...");
      const tx = await auction.bid(amount);
      await tx.wait();
      onStatus?.("Bid placed");
      setBidAmount("");
      await fetchState();
    } catch (err) {
      onStatus?.(err.message);
    } finally {
      onBusyChange?.(null);
      setLoading(false);
    }
  }, [signer, executionAuctionAddress, tokenAddress, bidAmount, fetchState, onBusyChange, onStatus]);

  const handleWinnerExecute = useCallback(async () => {
    if (!signer || !executionAuctionAddress) return;
    onBusyChange?.("auction-winner-execute");
    setLoading(true);
    try {
      const ethersLib = await import("ethers");
      const auction = new ethersLib.Contract(
        ethersLib.getAddress(executionAuctionAddress),
        executionAuctionAbi,
        signer
      );
      onStatus?.("Executing as winner...");
      const tx = await auction.winnerExecute();
      await tx.wait();
      onStatus?.("Winner execute confirmed");
      await fetchState();
    } catch (err) {
      onStatus?.(err.message);
    } finally {
      onBusyChange?.(null);
      setLoading(false);
    }
  }, [signer, executionAuctionAddress, fetchState, onBusyChange, onStatus]);

  const handleFallbackExecute = useCallback(async () => {
    if (!signer || !executionAuctionAddress) return;
    onBusyChange?.("auction-fallback");
    setLoading(true);
    try {
      const ethersLib = await import("ethers");
      const auction = new ethersLib.Contract(
        ethersLib.getAddress(executionAuctionAddress),
        executionAuctionAbi,
        signer
      );
      onStatus?.("Fallback executing...");
      const tx = await auction.fallbackExecute();
      await tx.wait();
      onStatus?.("Fallback execute confirmed");
      await fetchState();
    } catch (err) {
      onStatus?.(err.message);
    } finally {
      onBusyChange?.(null);
      setLoading(false);
    }
  }, [signer, executionAuctionAddress, fetchState, onBusyChange, onStatus]);

  const handleClaimRefund = useCallback(async () => {
    if (!signer || !executionAuctionAddress) return;
    onBusyChange?.("auction-refund");
    setLoading(true);
    try {
      const ethersLib = await import("ethers");
      const auction = new ethersLib.Contract(
        ethersLib.getAddress(executionAuctionAddress),
        executionAuctionAbi,
        signer
      );
      onStatus?.("Claiming refund...");
      const tx = await auction.claimRefund();
      await tx.wait();
      onStatus?.("Refund claimed");
      await fetchState();
    } catch (err) {
      onStatus?.(err.message);
    } finally {
      onBusyChange?.(null);
      setLoading(false);
    }
  }, [signer, executionAuctionAddress, fetchState, onBusyChange, onStatus]);

  const phase = roundStatus?.currentPhase ?? 0;
  const phaseLabel = PHASE_LABELS[phase] ?? "Unknown";
  const isWinner = walletAddress && roundStatus?.winner?.toLowerCase() === walletAddress.toLowerCase();
  const isBusy = loading || !!busyAction;
  const hasPendingRefund = pendingRefund != null && pendingRefund > 0n;

  const phaseTone =
    phase === 1 ? "var(--accent)" :
    phase === 2 ? "var(--success)" :
    phase === 3 ? "var(--warning)" :
    "var(--text-muted)";

  return (
    <div className="card">
      <p className="eyebrow">Execution Auction (RRA)</p>
      <h3 className="cardTitle">Keeper Bid System</h3>

      {/* Phase + Round info */}
      <div className="kpiGrid" style={{ marginTop: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="kpi">
          <span className="kpiLabel">Round</span>
          <span className="kpiValue">#{roundStatus?.id != null ? String(roundStatus.id) : "—"}</span>
        </div>
        <div className="kpi">
          <span className="kpiLabel">Phase</span>
          <span className="kpiValue" style={{ color: phaseTone }}>{phaseLabel}</span>
        </div>
      </div>

      {/* Bid state */}
      <div style={{ marginTop: 12, fontSize: 11, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Winning bid</span>
          <span>{fmtUsdf(roundStatus?.winningBid)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Winner</span>
          <span style={{ color: isWinner ? "var(--success)" : "var(--text)" }}>
            {shortAddr(roundStatus?.winner)}{isWinner ? " (you)" : ""}
          </span>
        </div>
        {phase === 1 && roundStatus?.bidTimeRemaining != null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Bid time left</span>
            <span style={{ color: "var(--accent)" }}>{fmtSeconds(roundStatus.bidTimeRemaining)}</span>
          </div>
        )}
        {phase === 2 && roundStatus?.executeTimeRemaining != null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Execute time left</span>
            <span style={{ color: "var(--success)" }}>{fmtSeconds(roundStatus.executeTimeRemaining)}</span>
          </div>
        )}
        {auctionStats?.bidRevenue != null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Total bid revenue</span>
            <span>{fmtUsdf(auctionStats.bidRevenue)}</span>
          </div>
        )}
      </div>

      {/* Bid input */}
      {phase === 1 && (
        <div style={{ marginTop: 14, borderTop: "1px dashed rgba(255,255,255,.08)", paddingTop: 12 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Place Bid</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Bid amount"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              disabled={isBusy || !canOperate}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleBid}
              disabled={isBusy || !canOperate || !bidAmount}
            >
              Bid
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {phase === 2 && (
          <button
            onClick={handleWinnerExecute}
            disabled={isBusy || !canOperate || !isWinner}
            title={!isWinner ? "Only the winning bidder can execute" : ""}
          >
            Execute (Winner)
          </button>
        )}
        {phase === 3 && (
          <button onClick={handleFallbackExecute} disabled={isBusy || !canOperate}>
            Fallback Execute
          </button>
        )}
        {hasPendingRefund && (
          <button onClick={handleClaimRefund} disabled={isBusy || !canOperate}>
            Claim Refund ({fmtUsdf(pendingRefund)})
          </button>
        )}
      </div>

      {!executionAuctionAddress && (
        <p className="opsHint" style={{ marginTop: 10 }}>ExecutionAuction address not configured</p>
      )}
    </div>
  );
}
