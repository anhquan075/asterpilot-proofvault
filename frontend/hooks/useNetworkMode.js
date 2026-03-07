import { useState, useCallback } from "react";
import { NETWORK_MODE, DEFAULT_NETWORK_MODE, STORAGE_KEY } from "../lib/networkConfig.js";

/**
 * Persistent network mode toggle hook.
 * Reads initial value from localStorage, writes back on change.
 * Returns: { networkMode, isTestnet, isMainnet, toggleNetworkMode, setNetworkMode }
 */
export function useNetworkMode() {
  const [networkMode, setNetworkModeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (
        stored === NETWORK_MODE.TESTNET ||
        stored === NETWORK_MODE.MAINNET ||
        stored === NETWORK_MODE.CREDITCOIN_TESTNET
      ) {
        return stored;
      }
    } catch {
      // localStorage unavailable (SSR or private mode)
    }
    return DEFAULT_NETWORK_MODE;
  });

  const setNetworkMode = useCallback((mode) => {
    if (
      mode !== NETWORK_MODE.MAINNET &&
      mode !== NETWORK_MODE.TESTNET &&
      mode !== NETWORK_MODE.CREDITCOIN_TESTNET
    )
      return;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore write failures
    }
    setNetworkModeState(mode);
  }, []);

  const toggleNetworkMode = useCallback(() => {
    // Cycles through: Mainnet -> Testnet -> Creditcoin -> Mainnet
    let nextMode;
    if (networkMode === NETWORK_MODE.MAINNET) {
      nextMode = NETWORK_MODE.TESTNET;
    } else if (networkMode === NETWORK_MODE.TESTNET) {
      nextMode = NETWORK_MODE.CREDITCOIN_TESTNET;
    } else {
      nextMode = NETWORK_MODE.MAINNET;
    }
    setNetworkMode(nextMode);
  }, [networkMode, setNetworkMode]);

  return {
    networkMode,
    isTestnet: networkMode === NETWORK_MODE.TESTNET,
    isMainnet: networkMode === NETWORK_MODE.MAINNET,
    isCreditcoin: networkMode === NETWORK_MODE.CREDITCOIN_TESTNET,
    toggleNetworkMode,
    setNetworkMode,
  };
}
