
import { VaultCycleExecutionStatusCard } from "@/components/cards/vault-cycle-countdown-risk-score-and-execute-button-card";
import { VaultOraclePolicyMetricsCard } from "@/components/cards/vault-oracle-price-volatility-and-depeg-policy-metrics-card";
import { VaultStrategyAllocationBarCard } from "@/components/cards/vault-strategy-allocation-bar-and-target-bps-card";
import { VaultTransactionHistoryCard } from "@/components/cards/vault-transaction-history-with-bscscan-links-card";
import { VaultTvlStatsDepositWithdrawCard } from "@/components/cards/vault-tvl-stats-deposit-withdraw-card";
import { VaultTopNavbar } from "@/components/ui/vault-top-navbar-connect-wallet-and-branding-bar";
import { useRainbowKitWallet } from "@/hooks/use-rainbowkit-wallet";
import { useVaultReadState } from "@/hooks/use-vault-read-state";
import { useVaultWriteActions } from "@/hooks/use-vault-write-actions-deposit-withdraw-execute";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const MAINNET_V2_PRESET = {
  vaultAddress: import.meta.env.VITE_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000",
  engineAddress: import.meta.env.VITE_ENGINE_ADDRESS || "0x0000000000000000000000000000000000000000",
  tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS || "0x917AF46B3C3c6e1Bb7286B9F59637Fb7C65851Fb",
  policyAddress: import.meta.env.VITE_POLICY_ADDRESS || "0x0000000000000000000000000000000000000000",
  oracleAddress: import.meta.env.VITE_ORACLE_ADDRESS || "0x0000000000000000000000000000000000000000",
  asterAdapterAddress: import.meta.env.VITE_ASTER_ADAPTER_ADDRESS || "0x0000000000000000000000000000000000000000",
  secondaryAdapterAddress: import.meta.env.VITE_SECONDARY_ADAPTER_ADDRESS || "0x0000000000000000000000000000000000000000",
  pegArbExecutorAddress: import.meta.env.VITE_PEG_ARB_EXECUTOR_ADDRESS || "0x0000000000000000000000000000000000000000",
  circuitBreakerAddress: import.meta.env.VITE_CIRCUIT_BREAKER_ADDRESS || "0x0000000000000000000000000000000000000000",
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const BSCSCAN_ADDR = "https://bscscan.com/address/";

function shortAddr(addr) {
  if (!addr || addr === ZERO_ADDR) return "not set";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function ContractAddressBadge({ label, address }) {
  const isSet = address && address !== ZERO_ADDR;
  return (
    <span className={`contractBadge ${isSet ? "contractBadge--set" : "contractBadge--unset"}`}>
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

const SUPPORTED_CHAIN_IDS = new Set([56n]);
const BNB_PUBLIC_RPC = "https://bsc-dataseed.binance.org/";

export default function ProofVaultClientV2() {
  const [, setStatus] = useState("Loading v2 vault...");
  const [busyAction, setBusyAction] = useState(null);
  const { vaultAddress, engineAddress, tokenAddress } = MAINNET_V2_PRESET;
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [decimals, setDecimals] = useState(null);
  const [shareDecimals, setShareDecimals] = useState(null);
  const [publicProvider, setPublicProvider] = useState(null);

  const isBusy = busyAction !== null;
  const wallet = useRainbowKitWallet();
  const vaultState = useVaultReadState();
  const actions = useVaultWriteActions({ refresh: vaultState.refresh });

  const refreshArgs = useMemo(() => ({
    signer: wallet.signer,
    provider: wallet.provider ?? publicProvider,
    vaultAddress, engineAddress, tokenAddress,
    decimals, shareDecimals, setDecimals, setShareDecimals,
    setBusyAction, setStatus,
    setNetworkChainId: () => { },
    setShowNetworkModal: () => { },
  }), [wallet.signer, wallet.provider, publicProvider, vaultAddress, engineAddress, tokenAddress,
    decimals, shareDecimals]);

  // Init public provider
  useEffect(() => {
    import("ethers").then(({ JsonRpcProvider }) => {
      setPublicProvider(new JsonRpcProvider(BNB_PUBLIC_RPC));
    });
  }, []);

  // Initial load with public provider
  useEffect(() => {
    if (publicProvider && !wallet.signer) {
      vaultState.refresh({ ...refreshArgs, signer: null, provider: publicProvider });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicProvider]);

  // Refresh when wallet connects
  useEffect(() => {
    if (wallet.signer) {
      vaultState.refresh(refreshArgs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.signer]);



  const handleDeposit = useCallback(() =>
    actions.deposit({ signer: wallet.signer, vaultAddress, tokenAddress, depositAmount, decimals, setBusyAction, setStatus, refreshArgs }),
    [actions, wallet.signer, vaultAddress, tokenAddress, depositAmount, decimals, refreshArgs]);

  const handleWithdraw = useCallback(() =>
    actions.withdraw({ signer: wallet.signer, vaultAddress, withdrawAmount, decimals, setBusyAction, setStatus, refreshArgs }),
    [actions, wallet.signer, vaultAddress, withdrawAmount, decimals, refreshArgs]);

  const handleExecuteCycle = useCallback(() =>
    actions.executeCycle({ signer: wallet.signer, engineAddress, canExecute: vaultState.canExecute, canExecuteReason: vaultState.canExecuteReason, setBusyAction, setStatus, refreshArgs }),
    [actions, wallet.signer, engineAddress, vaultState.canExecute, vaultState.canExecuteReason, refreshArgs]);

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

      {/* Contract address strip — shows vault & engine addresses with BscScan links */}
      <div className="contractStrip">
        <ContractAddressBadge label="Vault" address={vaultAddress} />
        <ContractAddressBadge label="Engine" address={engineAddress} />
      </div>

      {/* Two-column dashboard: left=large content, right=compact panels */}
      <div className="v2-dash-layout">

        {/* LEFT — primary wide cards */}
        <div className="v2-dash-main">
          <VaultTvlStatsDepositWithdrawCard
            assets={vaultState.assets}
            shares={vaultState.shares}
            riskState={vaultState.riskState}
            decimals={decimals}
            shareDecimals={shareDecimals}
            configLocked={vaultState.configLocked}
            walletAddress={wallet.wallet}
            isConnected={wallet.isConnected}
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
          />
        </div>

        {/* RIGHT — compact metric panels + tx history (sticky top) */}
        <div className="v2-dash-sidebar">
          <VaultStrategyAllocationBarCard
            asterManagedAssets={vaultState.asterManagedAssets}
            secondaryManagedAssets={vaultState.secondaryManagedAssets}
            totalAssetsRaw={vaultState.totalAssetsRaw}
            algoMetrics={vaultState.algoMetrics}
          />

          <VaultOraclePolicyMetricsCard algoMetrics={vaultState.algoMetrics} />

          <VaultTransactionHistoryCard txHistory={actions.txHistory} />
        </div>

      </div>
    </section>
  );
}
