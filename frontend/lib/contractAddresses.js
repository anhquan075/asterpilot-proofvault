// Hardcoded address presets for ProofVault V2.
// These are the canonical deployed addresses used as fallbacks
// when environment variables are not set.
// networkConfig.js imports these as fallback values.

// BNB Chain Mainnet (Chain ID 56)
// Deployed: 2026-02-27 (v2 r3) via scripts/deploy-mainnet-full-stack.js
// LP rail enabled: StableSwapLPYieldAdapterWithFarm (pool 69)
// Deployer: 0xB789D888A53D34f6701C1A5876101Cb32dbF17cF
export const V2_MAINNET_PRESET = {
  vaultAddress: "0x2585181C92cf2b16248f74916CB7281E32Eab771",
  engineAddress: "0x96ab75cbea418ca2fc6b86D1569f71E91947f756",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  circuitBreakerAddress: "0x2E93E3d533B411733cF9F173c0e9a7A16Fc54B8E",
  sharpeTrackerAddress: "0x461D26B93d0298dAc819638137E4426FDF376B6d",
  pegArbExecutorAddress: "0x54e0361ED0E737E1B0163103e6b7C919523A2043",
  riskPolicyAddress: "0xAAbBF69b661a3d327dE386CEF65a4214566591a7",
  asterAdapterAddress: "0xbbd0f77227bCFC1791e5d51098243B36c600f954",
  secondaryAdapterAddress: "0xA88e397DE1CC0787C1b2efF8EC5A215FE4145858",
  lpAdapterAddress: "0x577CE23B0991F82240057e7A1c74272fbf768790",
  executionAuctionAddress: "0x1Cc719a414d56A5C38936743d4a518382f935d51",
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
