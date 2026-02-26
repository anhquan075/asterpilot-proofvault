// V2 Contract Addresses - BNB Mainnet (Chain ID 56)
// Deploy date: 2025 — 3-rail update with RRA ExecutionAuction
// All contracts verified on BscScan

export const V2_MAINNET_ADDRESSES = {
  vaultAddress: "0xdE1FBFc6a334e848152c4F938A2Ac2eeB0f6590b",
  engineAddress: "0x6570E79bC9dbe8e7EfbF929f3D877065293cd891",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT (BSC)
  circuitBreakerAddress: "0x65079A226a23f3F7786aa7FB231f84FB81CB43B3",
  sharpeTrackerAddress: "0x9953510D913e1D844a175404C9E7c49A8C163bEc",
  pegArbExecutorAddress: "0xA624EB4aC7A70eFf7DBADe603fb9d6bbd345954B",
  riskPolicyAddress: "0xE5675Db6eb5806F2c32FE905D8bbD609F5C417e1",
  asterAdapterAddress: "0x2E96DA33D701cAAEfb34d491A2c4D42f39C2529F",
  secondaryAdapterAddress: "0x5B752e0D04A8C7e7ca26290EA2dEFA61be814C51",
  lpAdapterAddress: "0x084Ad2C0D1254Cdd955FaFd9eC5b16D079D71df9",
  executionAuctionAddress: "0xf953624C4b2EB2300454EdaC9B548879F6cFEeB6",
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
