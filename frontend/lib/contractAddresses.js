// Hardcoded address presets for ProofVault V2.
// These are the canonical deployed addresses used as fallbacks
// when environment variables are not set.
// networkConfig.js imports these as fallback values.

// BNB Chain Mainnet (Chain ID 56)
// Deployed: 2026-02-27 (v2 r4) via scripts/deploy-mainnet-full-stack.js
// Fix: AsterEarnAdapterWithSwap now uses StableSwap pool for USDT→USDF swap
//      (no PancakeSwap V2 USDT/USDF pair exists on mainnet)
// Deployer: 0xB789D888A53D34f6701C1A5876101Cb32dbF17cF
export const V2_MAINNET_PRESET = {
  vaultAddress: "0x6E31A7F5b2565cDA914E9bd16e5d1e44E2390685",
  engineAddress: "0x2E0165Cc82c12791E9De65FdcaA5aEC50119E810",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  circuitBreakerAddress: "0x762862eaea188D8fc73Ce980280981F7bD70fe4E",
  sharpeTrackerAddress: "0x90173165243E5758A8fCdB338Cc06542cD1f2CB5",
  pegArbExecutorAddress: "0x0047D91F029cf25D73f8320c4eD36a0Fa7394B11",
  riskPolicyAddress: "0x0e4068228bF6bFA1e82793C9B0e10975E25BA55f",
  asterAdapterAddress: "0x9C1EC45318C5dd039d00610e53567CB387A3361c",
  secondaryAdapterAddress: "0xAdF903cA29eE03C2a313844452663aB31c10d93e",
  lpAdapterAddress: "0x4154Cf25F774AAA01530430BddF72835956B69CB",
  executionAuctionAddress: "0x55648020EFDA1D768aEaDa4f621049091441C1B0",
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
