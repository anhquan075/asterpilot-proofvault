// Hardcoded address presets for ProofVault V2.
// These are the canonical deployed addresses used as fallbacks
// when environment variables are not set.
// networkConfig.js imports these as fallback values.

// BNB Chain Mainnet (Chain ID 56)
// Deployed: 2026-02-27 (v2 r5) via scripts/deploy-mainnet-full-stack.js
// Fix r5: Correct USDF address (0x5A110fC = Astherus USDF, actual pool coin1)
//         Fix exchange coin indices: exchange(0,1) for USDT→USDF, exchange(1,0) for USDF→USDT
// Deployer: 0xB789D888A53D34f6701C1A5876101Cb32dbF17cF
export const V2_MAINNET_PRESET = {
  vaultAddress: "0x2db50C57F8F3D64bF9EfD8e387b460C744c3B5a8",
  engineAddress: "0x0b62Db1A942b4346F99516746b883eb848292126",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  circuitBreakerAddress: "0x7B64283e43A15DCE74517a9B43Bcb110ABcb9bD6",
  sharpeTrackerAddress: "0x51cB598F207E8D7Aee8138864e8Ec22313c4bA66",
  pegArbExecutorAddress: "0x178Ea822aDa80c21385CEB0E153D887Dd50b8779",
  riskPolicyAddress: "0xfC01B5b5Feb7Cd83E33156D3e1ea55Cc33DF501F",
  asterAdapterAddress: "0x636888514c3a475817eDc71F2000460925Ff1399",
  secondaryAdapterAddress: "0xFE4680524fdFEF452CeD1fafF5319CD05380E92b",
  lpAdapterAddress: "0xDb5a6b027EA60bdbec6D45212F353Ee9a6099009",
  executionAuctionAddress: "0xa9F21bCCD4B4Be87EE8Cb6Ab1841B6597513CDdc",
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
