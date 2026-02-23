
import { useCallback, useState } from "react";
import { engineAbi, erc20Abi, vaultAbi } from "@/lib/abi";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
function assertAddress(addr, label) {
  if (!addr || addr.trim() === ZERO_ADDR) throw new Error(`${label} not configured. Set the contract address in .env`);
}

/// Manages deposit, withdraw, executeCycle write actions and tx history log.
export function useVaultWriteActions({ refresh }) {
  const [txHistory, setTxHistory] = useState([]);

  const appendTx = useCallback((action, hash, outcome, note) => {
    setTxHistory((prev) => {
      const next = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          action, hash, outcome, note,
          at: new Date().toISOString(),
        },
        ...prev,
      ];
      return next.slice(0, 8);
    });
  }, []);

  const deposit = useCallback(async ({
    signer, vaultAddress, tokenAddress, depositAmount,
    decimals, setBusyAction, setStatus,
    refreshArgs,
  }) => {
    setBusyAction("deposit");
    try {
      const ethersLib = await import("ethers");
      if (!signer) throw new Error("Connect wallet first");
      assertAddress(vaultAddress, "Vault");

      const vault = new ethersLib.Contract(ethersLib.getAddress(vaultAddress.trim()), vaultAbi, signer);

      // Normalize token address checksum; fall back to vault.asset() if not provided
      const rawTokenAddr = tokenAddress ? tokenAddress.trim() : (await vault.asset());
      const token = new ethersLib.Contract(ethersLib.getAddress(rawTokenAddr), erc20Abi, signer);
      const amount = ethersLib.parseUnits(depositAmount || "0", decimals);
      if (amount <= 0n) throw new Error("Invalid deposit amount");

      setStatus("Approving token...");
      const approveTx = await token.approve(await vault.getAddress(), amount);
      await approveTx.wait();

      setStatus("Depositing...");
      const tx = await vault.deposit(amount, await signer.getAddress());
      await tx.wait();
      appendTx("Deposit", tx.hash, "success", "Deposit mined");
      await refresh(refreshArgs);
      setStatus("Deposit complete");
    } catch (error) {
      appendTx("Deposit", null, "failed", error.message);
      setStatus(error.message);
    } finally {
      setBusyAction(null);
    }
  }, [appendTx, refresh]);

  const withdraw = useCallback(async ({
    signer, vaultAddress, withdrawAmount,
    decimals, setBusyAction, setStatus,
    refreshArgs,
  }) => {
    setBusyAction("withdraw");
    try {
      const ethersLib = await import("ethers");
      if (!signer) throw new Error("Connect wallet first");
      assertAddress(vaultAddress, "Vault");

      const vault = new ethersLib.Contract(ethersLib.getAddress(vaultAddress.trim()), vaultAbi, signer);
      const amount = ethersLib.parseUnits(withdrawAmount || "0", decimals);
      if (amount <= 0n) throw new Error("Invalid withdraw amount");

      // Pre-flight: check maxWithdraw to avoid on-chain revert with unhelpful error
      const userAddr = await signer.getAddress();
      const maxW = await vault.maxWithdraw(userAddr).catch(() => 0n);
      if (amount > maxW) {
        const fmtMax = ethersLib.formatUnits(maxW, decimals);
        throw new Error(
          maxW === 0n
            ? "Nothing to withdraw — vault has no liquid assets available (maxWithdraw = 0). You may need to wait for a rebalance cycle or the vault may have no deposited funds."
            : `Amount exceeds max withdrawable. Max: ${fmtMax} tokens.`
        );
      }

      setStatus("Withdrawing...");
      const tx = await vault.withdraw(amount, userAddr, userAddr);
      await tx.wait();
      appendTx("Withdraw", tx.hash, "success", "Withdraw mined");
      await refresh(refreshArgs);
      setStatus("Withdraw complete");
    } catch (error) {
      // ERC4626ExceededMaxWithdraw = 0xfe9cceec — vault maxWithdraw < requested amount
      const msg = error.code === "CALL_EXCEPTION" && error.data?.startsWith("0xfe9cceec")
        ? "Withdraw rejected: vault maxWithdraw is 0. No liquid assets available to redeem."
        : error.message;
      appendTx("Withdraw", null, "failed", msg);
      setStatus(msg);
    } finally {
      setBusyAction(null);
    }
  }, [appendTx, refresh]);

  const executeCycle = useCallback(async ({
    signer, engineAddress, canExecute, canExecuteReason,
    setBusyAction, setStatus, refreshArgs,
  }) => {
    setBusyAction("execute");
    try {
      const ethersLib = await import("ethers");
      if (!signer) throw new Error("Connect wallet first");
      assertAddress(engineAddress, "Engine");

      // Pre-flight: use already-fetched canExecute state to avoid redundant contract call
      if (canExecute === false) {
        throw new Error(`Cannot execute: ${canExecuteReason || "not ready"}`);
      }

      const engine = new ethersLib.Contract(ethersLib.getAddress(engineAddress.trim()), engineAbi, signer);

      // Fresh canExecute() check right before sending — catches any state change since last refresh
      const [ok, reasonBytes32] = await engine.canExecute();
      if (!ok) {
        let reason = canExecuteReason || "-";
        try { reason = ethersLib.decodeBytes32String(reasonBytes32); } catch { /* keep fallback */ }
        throw new Error(`Not ready: ${reason}`);
      }

      setStatus("Executing cycle...");
      const tx = await engine.executeCycle();
      await tx.wait();
      appendTx("Execute Cycle", tx.hash, "success", "Cycle execution confirmed");
      await refresh(refreshArgs);
      setStatus("Cycle executed");
    } catch (error) {
      // CALL_EXCEPTION = on-chain revert with no reason string (bare revert() in contract).
      // Known root cause: vault.rebalance() → _rebalanceAster() → asterAdapter.withdrawToVault()
      // → _callWithAmount(withdrawSelector, amount) → asterMinter.call() returns false
      // → require(ok, "aster call failed") reverts. The AsterDEX minter rejected the withdrawal.
      const msg = error.code === "CALL_EXCEPTION"
        ? "AsterDEX minter rejected the withdrawal call (vault.rebalance → asterAdapter.withdrawToVault → minter returned false). Algorithm decision was valid — failure is in the AsterDEX adapter layer."
        : error.message;
      appendTx("Execute Cycle", null, "failed", msg);
      setStatus(msg);
    } finally {
      setBusyAction(null);
    }
  }, [appendTx, refresh]);

  return { txHistory, deposit, withdraw, executeCycle };
}
