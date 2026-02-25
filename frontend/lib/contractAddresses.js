// V2 Contract Addresses - BNB Mainnet (Chain ID 56)
// Deploy date: 2025 — 3-rail update with RRA ExecutionAuction
// All contracts verified on BscScan

export const V2_MAINNET_ADDRESSES = {
  vaultAddress: "0xC6C1A0920a175714Ceb8f5D3dB6b177B0e5db222",
  engineAddress: "0x261464a2126be9E0283D575E10e13108cbeB7FaE",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT (BSC)
  circuitBreakerAddress: "0xfEBEbC027B544cF6195d6E709E28c4A6F138C69b",
  sharpeTrackerAddress: "0x318940C7745d87Eb75BEf09dA08d474c38f15992",
  pegArbExecutorAddress: "0x85CadC723dc6CF1654DA3C15Ffaf07e1851753BA",
  riskPolicyAddress: "0x74C3A9FCC2CC02280a448F6A922BE45CD68297Ec",
  asterAdapterAddress: "0x4695ef4ADE0D065C8901870876e75fE7b13210E3",
  secondaryAdapterAddress: "0x76505B830098302e94906Bd5a77B89569bCc7498",
  lpAdapterAddress: "0x198E9ECfaA22d8385c386038e810788c9a358c74",
  executionAuctionAddress: "0xbC3D99421A93e4f2E5bB868DAEC2a03aE96aFD33",
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
