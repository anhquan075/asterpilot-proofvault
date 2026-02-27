// Hardcoded address presets for ProofVault V2.
// These are the canonical deployed addresses used as fallbacks
// when environment variables are not set.
// networkConfig.js imports these as fallback values.

// BNB Chain Mainnet (Chain ID 56)
export const V2_MAINNET_PRESET = {
  vaultAddress: "0xCF386Dd2c8C8356cdBF76e5c3D53B5Ef89362644",
  engineAddress: "0xb621062d6651E1D975e3134c86FA9db1fab909B7",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  circuitBreakerAddress: "0x0000000000000000000000000000000000000000",
  sharpeTrackerAddress: "0x0000000000000000000000000000000000000000",
  pegArbExecutorAddress: "0x0000000000000000000000000000000000000000",
  riskPolicyAddress: "0x0000000000000000000000000000000000000000",
  asterAdapterAddress: "0x0000000000000000000000000000000000000000",
  secondaryAdapterAddress: "0x0000000000000000000000000000000000000000",
  executionAuctionAddress: "0x147a91205d5eb67CFEEAd48a0e8b3443DE4B1e27",
};

// BNB Chain Testnet (Chain ID 97)
// Deployed: 2026-02-27 (v2) via scripts/deploy-testnet-full-stack-with-mocks.js
// chainlinkStalePeriod = 259200 (3 days)
// Fix: ProofVault slippage check now excludes executor bounty from baseline
export const V2_TESTNET_PRESET = {
  vaultAddress: "0xA7207caCEA25b8a9BFf289C8aCCcD257C862314D",
  engineAddress: "0x6518CFAf53C39D6127723D67402e63E636Dd1c3E",
  tokenAddress: "0x74bda872E528c58D66d5DBd9Bb9072b06d99f510", // mock USDT
  circuitBreakerAddress: "0xfB5D6f83b1a5c42dFCd3fFAF76d0eF0d5ae5cB66",
  sharpeTrackerAddress: "0xe4eB72e5d29AA868948F2a691255BAAFf4A8b479",
  pegArbExecutorAddress: "0xeE5Fd164378Dca028586ef4C72e633A7b248dC1c",
  riskPolicyAddress: "0x55D9BCB9F13Ca2d5aD3345E60234E48e6A719133",
  asterAdapterAddress: "0x096148CE528701614dF518B217A430A88635d561",
  secondaryAdapterAddress: "0x30d4F9f3e98BadD935872b03F64Bdb4F7AaE8628",
  executionAuctionAddress: "0x9e5763A7C11DB894A6aA1164cFDc849F9243751B",
};
