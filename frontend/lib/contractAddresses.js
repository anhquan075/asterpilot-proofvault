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
  vaultAddress: "0xFF500c8efFf28F71F7167F7d3c3b92724fFEaB50",
  engineAddress: "0x264aaAbe5a7C13556fDcf7d01e25d162EB80B846",
  tokenAddress: "0x07413d9320Ca0804070d787021EbE5440896BC44", // mock USDT
  circuitBreakerAddress: "0x1E63C0F23D89eC3b58b696d7c17Bb0159A25DEF5",
  sharpeTrackerAddress: "0xfcCfE943563E3C46B01eeFE601E8C7826e0219dB",
  pegArbExecutorAddress: "0x9e334c02a4fb0f4Ba642066E418BD1De6B0072d0",
  riskPolicyAddress: "0x372cd31121C139da2f78173dfc6D5edbd066Fa9D",
  asterAdapterAddress: "0xF4CA93D2d2195Aa84f987ED74A7c7Dd94DbB19E2",
  secondaryAdapterAddress: "0x9188Ce2D130A9b5dE17Ff2f5Cb5D0adC17Ce9530",
  executionAuctionAddress: "0xa4d6685743f585820d20Fdc7200B1b29352000C3",
};
