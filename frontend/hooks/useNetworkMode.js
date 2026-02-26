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
      if (stored === NETWORK_MODE.TESTNET || stored === NETWORK_MODE.MAINNET) {
        return stored;
      }
    } catch {
      // localStorage unavailable (SSR or private mode)
    }
    return DEFAULT_NETWORK_MODE;
  });

  const setNetworkMode = useCallback((mode) => {
    if (mode !== NETWORK_MODE.MAINNET && mode !== NETWORK_MODE.TESTNET) return;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore write failures
    }
    setNetworkModeState(mode);
  }, []);

  const toggleNetworkMode = useCallback(() => {
    setNetworkMode(
      networkMode === NETWORK_MODE.MAINNET ? NETWORK_MODE.TESTNET : NETWORK_MODE.MAINNET
    );
  }, [networkMode, setNetworkMode]);

  return {
    networkMode,
    isTestnet: networkMode === NETWORK_MODE.TESTNET,
    isMainnet: networkMode === NETWORK_MODE.MAINNET,
    toggleNetworkMode,
    setNetworkMode,
  };
}
