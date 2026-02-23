import { useCallback, useState } from "react";
import { engineAbi, oracleAbi, policyAbi, vaultAbi, erc20Abi, managedAdapterAbi } from "@/lib/abi";

function toSafeNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stateLabel(value) {
  if (value === 0n) return "Normal";
  if (value === 1n) return "Guarded";
  return "Drawdown";
}

function decodeReason(ethersLib, bytes32Reason) {
  try { return ethersLib.decodeBytes32String(bytes32Reason); } catch { return bytes32Reason; }
}

export function useVaultReadState() {
  const [assets, setAssets] = useState("-");
  const [riskState, setRiskState] = useState("-");
  const [shares, setShares] = useState("-");
  const [lastExec, setLastExec] = useState("-");
  const [canExecute, setCanExecute] = useState(null);
  const [canExecuteReason, setCanExecuteReason] = useState("-");
  const [riskScoreVal, setRiskScoreVal] = useState(null);
  const [timeUntilNext, setTimeUntilNext] = useState(null);
  const [cycleCountVal, setCycleCountVal] = useState(null);
  const [configLocked, setConfigLocked] = useState(null);
  const [totalAssetsRaw, setTotalAssetsRaw] = useState(null);
  const [userTokenBalance, setUserTokenBalance] = useState(null);
  const [asterManagedAssets, setAsterManagedAssets] = useState(null);
  const [secondaryManagedAssets, setSecondaryManagedAssets] = useState(null);
  const [bufferStatus, setBufferStatus] = useState(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(null);
  const [previewDecision, setPreviewDecision] = useState(null);
  const [algoMetrics, setAlgoMetrics] = useState({
    currentPrice: null,
    previousPrice: null,
    volatilityBps: null,
    guardedVolatilityBps: null,
    drawdownVolatilityBps: null,
    depegPrice: null,
    targetAsterBps: null,
    previewState: "-",
    previewReason: "-",
    normalAsterBps: null,
    guardedAsterBps: null,
    drawdownAsterBps: null,
  });

  const refresh = useCallback(async ({
    signer, provider, vaultAddress, engineAddress, tokenAddress,
    decimals, shareDecimals, setDecimals, setShareDecimals,
    setBusyAction, setStatus, setNetworkChainId, setShowNetworkModal,
  }) => {
    setBusyAction("refresh");
    try {
      const ethersLib = await import("ethers");
      const runner = signer ?? provider;
      if (!runner) throw new Error("No provider available");

      const vault = new ethersLib.Contract(ethersLib.getAddress(vaultAddress.trim()), vaultAbi, runner);
      const engine = new ethersLib.Contract(ethersLib.getAddress(engineAddress.trim()), engineAbi, runner);
      
      const vaultAssetAddress = await vault.asset().catch(() => tokenAddress);
      const token = new ethersLib.Contract(ethersLib.getAddress(vaultAssetAddress.trim()), erc20Abi, runner);
      
      let tokenDec = decimals;
      if (tokenDec === null) {
        try { tokenDec = await token.decimals(); } catch { tokenDec = 18n; }
        setDecimals(tokenDec);
      }
      let shareDec = shareDecimals;
      if (shareDec === null) {
        try { shareDec = await vault.decimals(); } catch { shareDec = 18n; }
        setShareDecimals(shareDec);
      }

      const user = signer ? await signer.getAddress() : null;
      const [
        totalAssets, currentState, userShares, lastExecution,
        canExec, previousPrice, policyAddress, oracleAddress,
        rawRiskScore, rawTimeUntilNext, rawCycleCount, isLocked, rawPreview,
        asterAdapterAddress, secondaryAdapterAddress, userTokenBal,
      ] = await Promise.all([
        vault.totalAssets().catch(() => null),
        engine.currentState().catch(() => null),
        user ? vault.balanceOf(user).catch(() => 0n) : Promise.resolve(0n),
        engine.lastExecution().catch(() => null),
        engine.canExecute().catch(() => [false, "0x"]),
        engine.lastPrice().catch(() => 0n),
        engine.policy().catch(() => null),
        engine.priceOracle().catch(() => null),
        engine.riskScore().catch(() => null),
        engine.timeUntilNextCycle().catch(() => null),
        engine.cycleCount().catch(() => null),
        vault.configurationLocked().catch(() => null),
        engine.previewDecision().catch(() => null),
        vault.asterAdapter().catch(() => null),
        vault.secondaryAdapter().catch(() => null),
        user ? token.balanceOf(user).catch(() => 0n) : Promise.resolve(0n),
      ]);
      
      if (rawPreview) {
        const pd = rawPreview.preview ?? rawPreview;
        setPreviewDecision({
          executable: pd.executable,
          nextState: Number(pd.nextState),
          price: pd.price,
          previousPrice: pd.previousPrice,
          volatilityBps: pd.volatilityBps,
          targetAsterBps: pd.targetAsterBps,
          bountyBps: pd.bountyBps,
        });
      }

      let currentPrice = null, guardedVolatilityBps = null, drawdownVolatilityBps = null;
      let depegPrice = null, normalAsterBps = null, guardedAsterBps = null, drawdownAsterBps = null;
      let rawAsterManaged = null, rawSecondaryManaged = null;

      if (policyAddress && oracleAddress) {
        const policy = new ethersLib.Contract(policyAddress, policyAbi, runner);
        const oracle = new ethersLib.Contract(oracleAddress, oracleAbi, runner);
        [currentPrice, guardedVolatilityBps, drawdownVolatilityBps, depegPrice, normalAsterBps, guardedAsterBps, drawdownAsterBps] =
          await Promise.all([
            oracle.getPrice().catch(() => null),
            policy.guardedVolatilityBps().catch(() => null),
            policy.drawdownVolatilityBps().catch(() => null),
            policy.depegPrice().catch(() => null),
            policy.normalAsterBps().catch(() => null),
            policy.guardedAsterBps().catch(() => null),
            policy.drawdownAsterBps().catch(() => null),
          ]);
      }

      if (asterAdapterAddress) {
        const asterAdapterContract = new ethersLib.Contract(asterAdapterAddress, managedAdapterAbi, runner);
        rawAsterManaged = await asterAdapterContract.managedAssets().catch(() => null);
      }
      if (secondaryAdapterAddress) {
        const secondaryAdapterContract = new ethersLib.Contract(secondaryAdapterAddress, managedAdapterAbi, runner);
        rawSecondaryManaged = await secondaryAdapterContract.managedAssets().catch(() => null);
      }

      const prevP = previousPrice ?? 0n;
      const curP = currentPrice ?? 0n;
      const priceDiff = curP >= prevP ? curP - prevP : prevP - curP;
      const volatilityBps = prevP > 0n ? (priceDiff * 10_000n) / prevP : null;

      let previewState = "Normal";
      let previewReason = "Volatility below guarded threshold";
      let targetAsterBps = normalAsterBps;

      if (currentPrice != null && depegPrice != null && drawdownVolatilityBps != null && volatilityBps != null) {
        if (currentPrice < depegPrice || volatilityBps >= drawdownVolatilityBps) {
          previewState = "Drawdown";
          targetAsterBps = drawdownAsterBps;
          previewReason = currentPrice < depegPrice ? "Price below depeg threshold" : "Volatility reached drawdown threshold";
        } else if (guardedVolatilityBps != null && volatilityBps >= guardedVolatilityBps) {
          previewState = "Guarded";
          targetAsterBps = guardedAsterBps;
          previewReason = "Volatility reached guarded threshold";
        }
      }

      setAlgoMetrics({ currentPrice, previousPrice: prevP, volatilityBps, guardedVolatilityBps, drawdownVolatilityBps, depegPrice, targetAsterBps, previewState, previewReason, normalAsterBps, guardedAsterBps, drawdownAsterBps });
      setAsterManagedAssets(rawAsterManaged);
      setSecondaryManagedAssets(rawSecondaryManaged);
      setTotalAssetsRaw(totalAssets);
      setAssets(totalAssets != null ? ethersLib.formatUnits(totalAssets, tokenDec) : "-");
      setRiskState(currentState != null ? stateLabel(currentState) : "-");
      setShares(ethersLib.formatUnits(userShares ?? 0n, shareDec));
      setUserTokenBalance(userTokenBal);
      setLastExec(lastExecution == null ? "-" : lastExecution === 0n ? "never" : new Date(Number(lastExecution) * 1000).toISOString());
      setConfigLocked(isLocked);

      const [isExecutable, reason] = canExec ?? [false, "0x"];
      setCanExecute(isExecutable);
      setCanExecuteReason(decodeReason(ethersLib, reason));
      setRiskScoreVal(toSafeNumber(rawRiskScore));
      setTimeUntilNext(toSafeNumber(rawTimeUntilNext));
      setCycleCountVal(toSafeNumber(rawCycleCount));
      setBufferStatus(null);
      setPendingWithdrawals(null);
      setStatus(`State refreshed | canExecute=${isExecutable} (${decodeReason(ethersLib, reason)})`);

      if (provider) {
        const network = await provider.getNetwork();
        setNetworkChainId(network.chainId);
        setShowNetworkModal(network.chainId !== 56n);
      }
    } catch (error) {
      setStatus(`Refresh failed: ${error.message}`);
    } finally {
      setBusyAction(null);
    }
  }, []);

  return {
    assets, riskState, shares, lastExec,
    canExecute, canExecuteReason,
    riskScoreVal, timeUntilNext, cycleCountVal,
    configLocked, algoMetrics, previewDecision,
    totalAssetsRaw, asterManagedAssets, secondaryManagedAssets,
    bufferStatus, pendingWithdrawals, userTokenBalance,
    refresh,
    toSafeNumber,
  };
}
