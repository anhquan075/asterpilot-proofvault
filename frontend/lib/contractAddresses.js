// Hardcoded address presets for ProofVault V2.
// These are the canonical deployed addresses used as fallbacks
// when environment variables are not set.
// networkConfig.js imports these as fallback values.

// BNB Chain Mainnet (Chain ID 56)
// Deployed: 2026-02-27 (v2 r2) via scripts/deploy-mainnet-full-stack.js
// Fix: Signal B threshold raised 100→8000 bps (pool sits at ~4968 bps normally)
// Deployer: 0xB789D888A53D34f6701C1A5876101Cb32dbF17cF
export const V2_MAINNET_PRESET = {
  vaultAddress: "0xf6ff5C42accaC935Ca6b83687280A1E8dc637D33",
  engineAddress: "0x0Bb17DbBF19Db46bA29e322675B5bc39e861C5a1",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  circuitBreakerAddress: "0x45619Dd30d5724C58B9aaa4608EeF9B32a718Fea",
  sharpeTrackerAddress: "0xA231a4d5bc9749FC26d109Aa3BebE8CC2b622dcF",
  pegArbExecutorAddress: "0xba5d34A2BC3ccD44598971A5C56E8FfA6BB78525",
  riskPolicyAddress: "0x2C932Cb04E629bdaB84488cDeB85Ef81B73654BC",
  asterAdapterAddress: "0x1896A0A3E4a348936D8BbdA989B27321db8d1590",
  secondaryAdapterAddress: "0xd03247B056a93350f820dC51E6D8502C277b4055",
  executionAuctionAddress: "0xd5536970711F8304F57EdFA76f9e74e248466DC3",
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
