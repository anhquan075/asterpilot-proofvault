
import { VaultCircuitBreakerCard, VaultDutchAuctionCard } from "@/components/shared/cards/VaultCircuitBreakerThreeSignalStatusCard";
import { VaultCycleExecutionStatusCard } from "@/components/shared/cards/VaultCycleExecutionStatusCard";
import { VaultExecutionAuctionRraBidCard } from "@/components/shared/cards/VaultExecutionAuctionRraBidCard";
import { VaultOraclePolicyMetricsCard } from "@/components/shared/cards/VaultOraclePolicyMetricsCard";
import { VaultPegArbOpportunityAndHistoryCard } from "@/components/shared/cards/VaultPegArbOpportunityAndHistoryCard";
import { VaultSharpeRatioYieldTrackerCard } from "@/components/shared/cards/VaultSharpeRatioYieldTrackerCard";
import { VaultStrategyAllocationBarCard } from "@/components/shared/cards/VaultStrategyAllocationBarCard";
import { VaultTransactionHistoryCard } from "@/components/shared/cards/VaultTransactionHistoryCard";
import { VaultTvlStatsDepositWithdrawCard } from "@/components/shared/cards/VaultTvlStatsDepositWithdrawCard";
import { VaultTopNavbar } from "@/components/shared/ui/VaultTopNavbar";
import { useRainbowKitWallet } from "@/hooks/useRainbowKitWallet";
import { useVaultV2ReadState } from "@/hooks/useVaultV2ReadState";
import { useVaultV2WriteActions } from "@/hooks/useVaultV2WriteActions";
import { V2_MAINNET_ADDRESSES } from "@/lib/contractAddresses";
import { AlertTriangle, ExternalLink, Shield, TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const V2_MAINNET_PRESET = {
  vaultAddress: V2_MAINNET_ADDRESSES.vaultAddress,
  engineAddress: V2_MAINNET_ADDRESSES.engineAddress,
  tokenAddress: V2_MAINNET_ADDRESSES.tokenAddress,
  circuitBreakerAddress: V2_MAINNET_ADDRESSES.circuitBreakerAddress,
  sharpeTrackerAddress: V2_MAINNET_ADDRESSES.sharpeTrackerAddress,
  pegArbExecutorAddress: V2_MAINNET_ADDRESSES.pegArbExecutorAddress,
  executionAuctionAddress: V2_MAINNET_ADDRESSES.executionAuctionAddress,
};

const SUPPORTED_CHAIN_IDS = new Set([56n]);
const BNB_PUBLIC_RPC = "https://bsc-dataseed.binance.org/";
const BSCSCAN_ADDR = "https://bscscan.com/address/";
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function shortAddr(addr) {
  if (!addr || addr === ZERO_ADDR) return "not set";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function ContractAddressBadge({ label, address, icon: Icon }) {
  const isSet = address && address !== ZERO_ADDR;
  return (
    <span className={`contractBadge ${isSet ? "contractBadge--set" : "contractBadge--unset"}`}>
      {Icon && <Icon size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />}
      <span className="contractBadgeLabel">{label}</span>
      {isSet
        ? <a href={`${BSCSCAN_ADDR}${address}`} target="_blank" rel="noopener noreferrer" className="contractBadgeAddr">
          {shortAddr(address)} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
        : <span className="contractBadgeAddr">not configured</span>
      }
    </span>
  );
}

export default function ProofVaultV2Client() {
  const [, setStatus] = useState("Loading live data...");
  const [busyAction, setBusyAction] = useState(null);
  const {
    vaultAddress,
    engineAddress,
    tokenAddress,
    circuitBreakerAddress,
    sharpeTrackerAddress,
    pegArbExecutorAddress,
    executionAuctionAddress,
  } = V2_MAINNET_PRESET;

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [decimals, setDecimals] = useState(null);
  const [shareDecimals, setShareDecimals] = useState(null);
  const [publicProvider, setPublicProvider] = useState(null);

  const isBusy = busyAction !== null;
  const wallet = useRainbowKitWallet();
  const { isConnected } = wallet;
  const vaultState = useVaultV2ReadState();
  const actions = useVaultV2WriteActions({ refresh: vaultState.refresh });

  const refreshArgs = useMemo(() => ({
    signer: wallet.signer,
    provider: wallet.provider ?? publicProvider,
    vaultAddress,
    engineAddress,
    tokenAddress,
    circuitBreakerAddress,
    sharpeTrackerAddress,
    pegArbExecutorAddress,
    decimals,
    shareDecimals,
    setDecimals,
    setShareDecimals,
    setBusyAction,
    setStatus,
    setNetworkChainId: () => { },
    setShowNetworkModal: () => { },
  }), [
    wallet.signer,
    wallet.provider,
    publicProvider,
    vaultAddress,
    engineAddress,
    tokenAddress,
    circuitBreakerAddress,
    sharpeTrackerAddress,
    pegArbExecutorAddress,
    decimals,
    shareDecimals
  ]);

  useEffect(() => {
    import("ethers").then(({ JsonRpcProvider }) => {
      setPublicProvider(new JsonRpcProvider(BNB_PUBLIC_RPC));
    });
  }, []);

  useEffect(() => {
    if (publicProvider && !wallet.signer) {
      vaultState.refresh({ ...refreshArgs, signer: null, provider: publicProvider });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicProvider]);

  useEffect(() => {
    if (wallet.signer) {
      vaultState.refresh(refreshArgs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.signer]);

  const handleDeposit = useCallback(() =>
    actions.deposit({
      signer: wallet.signer,
      vaultAddress,
      tokenAddress,
      depositAmount,
      decimals,
      setBusyAction,
      setStatus,
      refreshArgs
    }),
    [actions, wallet.signer, vaultAddress, tokenAddress, depositAmount, decimals, refreshArgs]
  );

  const handleWithdraw = useCallback(() =>
    actions.withdraw({
      signer: wallet.signer,
      vaultAddress,
      withdrawAmount,
      decimals,
      setBusyAction,
      setStatus,
      refreshArgs
    }),
    [actions, wallet.signer, vaultAddress, withdrawAmount, decimals, refreshArgs]
  );

  const handleExecuteCycle = useCallback(() =>
    actions.executeCycle({
      signer: wallet.signer,
      engineAddress,
      canExecute: vaultState.canExecute,
      canExecuteReason: vaultState.canExecuteReason,
      setBusyAction,
      setStatus,
      refreshArgs
    }),
    [actions, wallet.signer, engineAddress, vaultState.canExecute, vaultState.canExecuteReason, refreshArgs]
  );

  const handleExecuteArb = useCallback(() =>
    actions.executeArbitrage({
      signer: wallet.signer,
      pegArbExecutorAddress,
      setBusyAction,
      setStatus,
      refreshArgs,
    }),
    [actions, wallet.signer, pegArbExecutorAddress, refreshArgs]
  );

  const networkSupported = wallet.networkChainId === null || SUPPORTED_CHAIN_IDS.has(wallet.networkChainId);

  return (
    <section className="panel panel--enhanced">
      <VaultTopNavbar busyAction={busyAction} />

      {!networkSupported && (
        <div className="networkStrip">
          <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Wrong network detected. Switch to BNB Smart Chain (BSC Mainnet, Chain ID 56).
        </div>
      )}

      {/* V2 Contract address strip — 3-rail: Vault, Engine, CircuitBreaker, SharpeTracker, PegArb, Auction */}
      <div className="contractStrip contractStrip--v2">
        <div className="contractGroup contractGroup--core">
          <ContractAddressBadge label="Vault" address={vaultAddress} />
          <ContractAddressBadge label="Engine" address={engineAddress} />
        </div>
        <div className="contractGroup contractGroup--advanced">
          <ContractAddressBadge label="CircuitBreaker" address={circuitBreakerAddress} icon={Shield} />
          <ContractAddressBadge label="SharpeTracker" address={sharpeTrackerAddress} icon={TrendingUp} />
          <ContractAddressBadge label="PegArb" address={pegArbExecutorAddress} icon={Zap} />
          <ContractAddressBadge label="RRA Auction" address={executionAuctionAddress} icon={Zap} />
        </div>
      </div>

      {/* V2 Dashboard */}
      <div className="v2-dash-layout">

        {/* ── Row 1: Hero TVL & Status ── */}
        <div className="bento-section-header">
          <span className="bento-section-label">Vault Overview</span>
          <span className="bento-section-line" />
        </div>
        <div className="bento-row-flex">
          <div className="bento-row-main" style={{ flex: 7 }}>
            <VaultTvlStatsDepositWithdrawCard
              assets={vaultState.assets}
              shares={vaultState.shares}
              riskState={vaultState.riskState}
              cycleCountVal={vaultState.cycleCountVal}
              decimals={decimals}
              shareDecimals={shareDecimals}
              configLocked={vaultState.configLocked}
              walletAddress={wallet.wallet}
              isConnected={isConnected}
              canOperate={!!wallet.signer && !isBusy}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              isBusy={isBusy}
              busyAction={busyAction}
              totalAssetsRaw={vaultState.totalAssetsRaw}
              asterManagedAssets={vaultState.asterManagedAssets}
              userTokenBalance={vaultState.userTokenBalance}
            />
          </div>
          <div className="bento-row-side" style={{ flex: 3 }}>
            <VaultDutchAuctionCard auctionState={vaultState.auctionMetrics} />
            <VaultSharpeRatioYieldTrackerCard sharpeState={vaultState.sharpeMetrics} />
          </div>
        </div>
        {/* ── Row 2: Execution + Arbitrage ── */}
        <div className="bento-section-header">
          <span className="bento-section-label">Execution Engine</span>
          <span className="bento-section-line" />
        </div>
        <div className="bento-row-flex">
          <div className="bento-row-main" style={{ flex: 7 }}>
            <VaultCycleExecutionStatusCard
              lastExec={vaultState.lastExec}
              canExecute={vaultState.canExecute}
              canExecuteReason={vaultState.canExecuteReason}
              riskState={vaultState.riskState}
              riskScoreVal={vaultState.riskScoreVal}
              timeUntilNext={vaultState.timeUntilNext}
              cycleCountVal={vaultState.cycleCountVal}
              canOperate={!!wallet.signer && !isBusy}
              busyAction={busyAction}
              onExecuteCycle={handleExecuteCycle}
              previewDecision={vaultState.previewDecision}
              vaultHealthScore={vaultState.vaultHealthScore}
              vaultHealthLabel={vaultState.vaultHealthLabel}
            />
          </div>
          <div className="bento-row-side" style={{ flex: 3 }}>
            <VaultPegArbOpportunityAndHistoryCard
              arbPreview={vaultState.arbPreview}
              onExecuteArb={handleExecuteArb}
              busyAction={busyAction}
            />
          </div>
        </div>

        {/* ── Row 3: Strategy + Auction + Oracle ── */}
        <div className="bento-section-header">
          <span className="bento-section-label">Strategy &amp; Analytics</span>
          <span className="bento-section-line" />
        </div>
        <div className="bento-row-thirds">
          <VaultStrategyAllocationBarCard
            asterManagedAssets={vaultState.asterManagedAssets}
            secondaryManagedAssets={vaultState.secondaryManagedAssets}
            lpManagedAssets={vaultState.lpManagedAssets}
            lpStakingInfo={vaultState.lpStakingInfo}
            totalAssetsRaw={vaultState.totalAssetsRaw}
            algoMetrics={vaultState.algoMetrics}
            harvestGasEstimate={vaultState.harvestGasEstimate}
            harvestGasMultiplier={vaultState.harvestGasMultiplier}
          />
          <VaultExecutionAuctionRraBidCard
            executionAuctionAddress={executionAuctionAddress}
            tokenAddress={tokenAddress}
            signer={wallet.signer}
            walletAddress={wallet.wallet}
            canOperate={!!wallet.signer && !isBusy}
            busyAction={busyAction}
            onBusyChange={setBusyAction}
            onStatus={setStatus}
          />
          <VaultOraclePolicyMetricsCard
            algoMetrics={vaultState.algoMetrics}
            harvestGasEstimate={vaultState.harvestGasEstimate}
            harvestGasMultiplier={vaultState.harvestGasMultiplier}
          />
        </div>

        {/* ── Row 4: History ── */}
        <div className="bento-section-header">
          <span className="bento-section-label">Activity</span>
          <span className="bento-section-line" />
        </div>
        <VaultTransactionHistoryCard
          txHistory={actions.txHistory}
        />
      </div>
    </section>
  );
}
