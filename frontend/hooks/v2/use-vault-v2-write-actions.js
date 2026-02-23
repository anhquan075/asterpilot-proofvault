import { useCallback, useState } from "react";
import { engineV2Abi, erc20Abi, vaultV2Abi, pegArbAbi } from "@/lib/abi";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
function assertAddress(addr, label) {
  if (!addr || addr.trim() === ZERO_ADDR) throw new Error(`${label} not configured. Set the contract address in .env`);
}

/// V2 write actions: deposit, withdraw, executeCycle with tx history
export function useVaultV2WriteActions({ refresh }) {
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

      const vault = new ethersLib.Contract(ethersLib.getAddress(vaultAddress.trim()), vaultV2Abi, signer);

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

      const vault = new ethersLib.Contract(ethersLib.getAddress(vaultAddress.trim()), vaultV2Abi, signer);
      const amount = ethersLib.parseUnits(withdrawAmount || "0", decimals);
      if (amount <= 0n) throw new Error("Invalid withdraw amount");

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

      if (canExecute === false) {
        throw new Error(`Cannot execute: ${canExecuteReason || "not ready"}`);
      }

      const engine = new ethersLib.Contract(ethersLib.getAddress(engineAddress.trim()), engineV2Abi, signer);

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
      const msg = error.code === "CALL_EXCEPTION"
        ? "Circuit breaker paused or execution rejected. Check breaker status and algorithm decision."
        : error.message;
      appendTx("Execute Cycle", null, "failed", msg);
      setStatus(msg);
    } finally {
      setBusyAction(null);
    }
  }, [appendTx, refresh]);

  const executeArbitrage = useCallback(async ({
    signer, pegArbExecutorAddress, setBusyAction, setStatus, refreshArgs,
  }) => {
    setBusyAction("arb");
    try {
      const ethersLib = await import("ethers");
      if (!signer) throw new Error("Connect wallet first");
      assertAddress(pegArbExecutorAddress, "PegArbExecutor");

      const pegArb = new ethersLib.Contract(ethersLib.getAddress(pegArbExecutorAddress.trim()), pegArbAbi, signer);

      setStatus("Executing arbitrage...");
      const tx = await pegArb.executeArb();
      await tx.wait();
      appendTx("Execute Arb", tx.hash, "success", "Arbitrage executed");
      await refresh(refreshArgs);
      setStatus("Arbitrage complete");
    } catch (error) {
      const msg = error.code === "CALL_EXCEPTION"
        ? "Arbitrage execution failed. No profitable opportunity or slippage exceeded."
        : error.message;
      appendTx("Execute Arb", null, "failed", msg);
      setStatus(msg);
    } finally {
      setBusyAction(null);
    }
  }, [appendTx, refresh]);

  return { txHistory, deposit, withdraw, executeCycle, executeArbitrage };
}
