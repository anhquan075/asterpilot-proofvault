/**
 * Network configuration for ProofVault.
 * Single source of truth for mainnet vs testnet switching.
 * Env vars override the preset fallbacks from contractAddresses.js.
 */
import { V2_MAINNET_PRESET, V2_TESTNET_PRESET } from "./contractAddresses.js";

export const NETWORK_MODE = {
  MAINNET: "mainnet",
  TESTNET: "testnet",
};

export const NETWORK_CONFIGS = {
  [NETWORK_MODE.MAINNET]: {
    label: "Mainnet",
    chainId: 56n,
    chainIdNum: 56,
    rpcUrl: import.meta.env.VITE_BNB_PUBLIC_RPC_URL || "https://bsc-rpc.publicnode.com",
    blockExplorer: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    vUSDTAddress: "0xfD5840Cd36d94D7229439859C0112a4185BC0255",  // Venus vUSDT BSC mainnet
    contracts: {
      vaultAddress:             import.meta.env.VITE_VAULT_ADDRESS             || V2_MAINNET_PRESET.vaultAddress,
      engineAddress:            import.meta.env.VITE_ENGINE_ADDRESS             || V2_MAINNET_PRESET.engineAddress,
      tokenAddress:             import.meta.env.VITE_TOKEN_ADDRESS              || V2_MAINNET_PRESET.tokenAddress,
      circuitBreakerAddress:    import.meta.env.VITE_CIRCUIT_BREAKER_ADDRESS   || V2_MAINNET_PRESET.circuitBreakerAddress,
      sharpeTrackerAddress:     import.meta.env.VITE_SHARPE_TRACKER_ADDRESS    || V2_MAINNET_PRESET.sharpeTrackerAddress,
      pegArbExecutorAddress:    import.meta.env.VITE_PEG_ARB_EXECUTOR_ADDRESS  || V2_MAINNET_PRESET.pegArbExecutorAddress,
      riskPolicyAddress:        import.meta.env.VITE_POLICY_ADDRESS            || V2_MAINNET_PRESET.riskPolicyAddress,
      asterAdapterAddress:      import.meta.env.VITE_ASTER_ADAPTER_ADDRESS     || V2_MAINNET_PRESET.asterAdapterAddress,
      secondaryAdapterAddress:  import.meta.env.VITE_SECONDARY_ADAPTER_ADDRESS || V2_MAINNET_PRESET.secondaryAdapterAddress,
      executionAuctionAddress:  import.meta.env.VITE_EXECUTION_AUCTION_ADDRESS || V2_MAINNET_PRESET.executionAuctionAddress,
    },
  },

  [NETWORK_MODE.TESTNET]: {
    label: "Testnet",
    chainId: 97n,
    chainIdNum: 97,
    rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
    blockExplorer: "https://testnet.bscscan.com",
    nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
    vUSDTAddress: "0x5e68daa5deCdAB5a6bC97d2DB0E95adaD22E33e3",  // Venus vUSDT BSC testnet
    contracts: {
      vaultAddress:             import.meta.env.VITE_TESTNET_VAULT_ADDRESS             || V2_TESTNET_PRESET.vaultAddress,
      engineAddress:            import.meta.env.VITE_TESTNET_ENGINE_ADDRESS             || V2_TESTNET_PRESET.engineAddress,
      tokenAddress:             import.meta.env.VITE_TESTNET_TOKEN_ADDRESS              || V2_TESTNET_PRESET.tokenAddress,
      circuitBreakerAddress:    import.meta.env.VITE_TESTNET_CIRCUIT_BREAKER_ADDRESS   || V2_TESTNET_PRESET.circuitBreakerAddress,
      sharpeTrackerAddress:     import.meta.env.VITE_TESTNET_SHARPE_TRACKER_ADDRESS    || V2_TESTNET_PRESET.sharpeTrackerAddress,
      pegArbExecutorAddress:    import.meta.env.VITE_TESTNET_PEG_ARB_EXECUTOR_ADDRESS  || V2_TESTNET_PRESET.pegArbExecutorAddress,
      riskPolicyAddress:        import.meta.env.VITE_TESTNET_POLICY_ADDRESS            || V2_TESTNET_PRESET.riskPolicyAddress,
      asterAdapterAddress:      import.meta.env.VITE_TESTNET_ASTER_ADAPTER_ADDRESS     || V2_TESTNET_PRESET.asterAdapterAddress,
      secondaryAdapterAddress:  import.meta.env.VITE_TESTNET_SECONDARY_ADAPTER_ADDRESS || V2_TESTNET_PRESET.secondaryAdapterAddress,
      executionAuctionAddress:  import.meta.env.VITE_TESTNET_EXECUTION_AUCTION_ADDRESS || V2_TESTNET_PRESET.executionAuctionAddress,
    },
  },
};

/** Default mode — can be overridden by env var VITE_DEFAULT_NETWORK=testnet */
export const DEFAULT_NETWORK_MODE =
  import.meta.env.VITE_DEFAULT_NETWORK === NETWORK_MODE.TESTNET
    ? NETWORK_MODE.TESTNET
    : NETWORK_MODE.MAINNET;

export const STORAGE_KEY = "proofvault_network_mode";
