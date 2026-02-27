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
// Deployed: 2026-02-27 via scripts/deploy-testnet-full-stack-with-mocks.js
// chainlinkStalePeriod = 259200 (3 days)
export const V2_TESTNET_PRESET = {
  vaultAddress: "0xf953624C4b2EB2300454EdaC9B548879F6cFEeB6",
  engineAddress: "0x6fC173849E6a993292F538cA48eB4fd00c3605e5",
  tokenAddress: "0x65079A226a23f3F7786aa7FB231f84FB81CB43B3", // mock USDT
  circuitBreakerAddress: "0xCD58f14320e827E388AeA50Bb48b8E4c1eE48de0",
  sharpeTrackerAddress: "0xE9d9c3564a8dC75c553390f15f7Fbb7a81531BD0",
  pegArbExecutorAddress: "0x6D9C5EE63d8a4eea6E0f6354f38F14525D169be5",
  riskPolicyAddress: "0xDB16526616a12ED2d0Cb7bfa5681929Fd1e97211",
  asterAdapterAddress: "0x3d5795ad0f1b160B751ac2a00Cf451c57bb210D8",
  secondaryAdapterAddress: "0x5d31f59bE9131B8d884de1c9E2035A9767933881",
  executionAuctionAddress: "0x800BCDa679e8D458248D4342D8DD53253CC2ffBE",
};
