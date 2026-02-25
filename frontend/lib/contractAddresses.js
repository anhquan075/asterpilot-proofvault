// V2 Contract Addresses - BNB Mainnet (Chain ID 56)
// Deploy date: 2025 — 3-rail update with RRA ExecutionAuction
// All contracts verified on BscScan

export const V2_MAINNET_ADDRESSES = {
  vaultAddress: "0x380068C20898bbEc6151A0CA543Cbac5f7406D94",
  engineAddress: "0x1525E262Cb5bDFC7b51802c36a1141bA94405F76",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT (BSC)
  circuitBreakerAddress: "0x0b2AaF882E89F36F5594cfe9b561f4436ca281Fd",
  sharpeTrackerAddress: "0x119f05215A8f46f6bDCc3112b6dA2B8B2871fDa2",
  pegArbExecutorAddress: "0xd4ebdCEB7B622B2d1D22E8634F1Ff9168e27D00C",
  riskPolicyAddress: "0xebeaf58f2529c4841C0A94d9B5c08E1fdEc81156",
  asterAdapterAddress: "0x61e5e3e0C124a2F1BD7b6D34A6182f42190Cb2FB",
  secondaryAdapterAddress: "0xC4B3e9EAded16eF7F594D7C8932Ef67Ff0d9bd72",
  lpAdapterAddress: "0x6e72AeF9701Bf5DeDF4Fc0E680a0d90cA631Ed73",
  executionAuctionAddress: "0x61AA075D27EE215d31eC9ff3d04699DBb084F55C",
};

// Environment-based configuration (fallback to mainnet if not set)
export const V2_ADDRESSES = {
  vaultAddress: import.meta.env.VITE_V2_VAULT_ADDRESS ?? V2_MAINNET_ADDRESSES.vaultAddress,
  engineAddress: import.meta.env.VITE_V2_ENGINE_ADDRESS ?? V2_MAINNET_ADDRESSES.engineAddress,
  tokenAddress: import.meta.env.VITE_V2_TOKEN_ADDRESS ?? V2_MAINNET_ADDRESSES.tokenAddress,
  circuitBreakerAddress: import.meta.env.VITE_V2_CIRCUIT_BREAKER_ADDRESS ?? V2_MAINNET_ADDRESSES.circuitBreakerAddress,
  sharpeTrackerAddress: import.meta.env.VITE_V2_SHARPE_TRACKER_ADDRESS ?? V2_MAINNET_ADDRESSES.sharpeTrackerAddress,
  pegArbExecutorAddress: import.meta.env.VITE_V2_PEG_ARB_ADDRESS ?? V2_MAINNET_ADDRESSES.pegArbExecutorAddress,
  riskPolicyAddress: import.meta.env.VITE_V2_RISK_POLICY_ADDRESS ?? V2_MAINNET_ADDRESSES.riskPolicyAddress,
  asterAdapterAddress: import.meta.env.VITE_V2_ASTER_ADAPTER_ADDRESS ?? V2_MAINNET_ADDRESSES.asterAdapterAddress,
  secondaryAdapterAddress: import.meta.env.VITE_V2_SECONDARY_ADAPTER_ADDRESS ?? V2_MAINNET_ADDRESSES.secondaryAdapterAddress,
  lpAdapterAddress: import.meta.env.VITE_V2_LP_ADAPTER_ADDRESS ?? V2_MAINNET_ADDRESSES.lpAdapterAddress,
  executionAuctionAddress: import.meta.env.VITE_V2_EXECUTION_AUCTION_ADDRESS ?? V2_MAINNET_ADDRESSES.executionAuctionAddress,
};
