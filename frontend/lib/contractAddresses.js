// V2 Contract Addresses - BNB Mainnet (Chain ID 56)
// Deploy date: 2025 — 3-rail update with RRA ExecutionAuction
// All contracts verified on BscScan

export const V2_MAINNET_ADDRESSES = {
  vaultAddress: "0xA784CD190DAB318a65D12CF426e37bb0f90A83C7",
  engineAddress: "0x3138f4157f15EFF0A76F8F610062bC82c13C5dbd",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT (BSC)
  circuitBreakerAddress: "0xCfd177b13e470B213B45D74Ae4d44C2FDFedDF50",
  sharpeTrackerAddress: "0x7c5EF5d9055d7f40A253133fBA86edE4ED4230A3",
  pegArbExecutorAddress: "0x80F78eC503b487950b48DF45598d48aa0E1BfCa4",
  riskPolicyAddress: "0x9179d50fFCBEC37e0C2c6F31cC569444F167c39D",
  asterAdapterAddress: "0xA131bD4Ac6e1c619a73C981E23fD9322BeB8e7DB",
  secondaryAdapterAddress: "0xf5B7bF143045B0e59E2D854726424A8C77CE2250",
  lpAdapterAddress: "0x951C62Cdf99628BFa7d036F3C53D6ddD9a9E592b",
  executionAuctionAddress: "0x0bA114a1f999C4d1B81a4F89f93A804CBcBFcBF7",
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
