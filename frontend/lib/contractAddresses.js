// V2 Contract Addresses - BNB Mainnet (Chain ID 56)
// Deploy date: 2025 — 3-rail update with RRA ExecutionAuction
// All contracts verified on BscScan

export const V2_MAINNET_ADDRESSES = {
  vaultAddress: "0x532495CaaAC982C406a68DFa30E12c67642F1BEA",
  engineAddress: "0x421824207F1c0872c16a9994d6e7313a03E80097",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT (BSC)
  circuitBreakerAddress: "0xeE5Fd164378Dca028586ef4C72e633A7b248dC1c",
  sharpeTrackerAddress: "0x9e5763A7C11DB894A6aA1164cFDc849F9243751B",
  pegArbExecutorAddress: "0xeC4E3466391df9627fD5FD62f18048Bb9007C3F6",
  riskPolicyAddress: "0x6518CFAf53C39D6127723D67402e63E636Dd1c3E",
  asterAdapterAddress: "0x742E46B3643c1C7AF6045950bA6Ad82707852712",
  secondaryAdapterAddress: "0x15B98DB1eC4e5caEa516bfEe4f37edf1e84D1339",
  lpAdapterAddress: "0xD7b76ef3556F7934C1b7Aea1AB3c5f3d20c2DE0a",
  executionAuctionAddress: "0x1da5Da9270345d6EcF1F29e3C674Bee2D414626b",
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
