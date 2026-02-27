// Hardcoded address presets for ProofVault V2.
// These are the canonical deployed addresses used as fallbacks
// when environment variables are not set.
// networkConfig.js imports these as fallback values.

// BNB Chain Mainnet (Chain ID 56)
// Deployed: 2026-02-27 (v2) via scripts/deploy-mainnet-full-stack.js
// Deployer: 0xB789D888A53D34f6701C1A5876101Cb32dbF17cF
export const V2_MAINNET_PRESET = {
  vaultAddress: "0xD81fCB29b09aD7d72AD53E9f842AB16989fb7175",
  engineAddress: "0x8e64C7Da37814d8A9f99a66719a92701c3263342",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  circuitBreakerAddress: "0x54CB320C14b486e2F9ebf0479720Ec0e2B3575fB",
  sharpeTrackerAddress: "0x069a30d0AB051db5208DdE515D6B8622a31F9358",
  pegArbExecutorAddress: "0xb6FE71870dD5Ecc6AC5f4170cf3890B2fAB1b778",
  riskPolicyAddress: "0x572D5DB8F76A23B969b6aeA13557A6Ce24583131",
  asterAdapterAddress: "0xE2942aCc4B18F77Ba35a64d9020E6E1061108A15",
  secondaryAdapterAddress: "0x17B959816e2AfD8A2178B9ACAbC7EB7739DfF8D5",
  executionAuctionAddress: "0x364Efe8C3C9d93499F5f67112E85946f3F0e9Cec",
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
