// Hardcoded address presets for ProofVault V2.
// These are the canonical deployed addresses used as fallbacks
// when environment variables are not set.
// networkConfig.js imports these as fallback values.

// BNB Chain Mainnet (Chain ID 56)
export const V2_MAINNET_PRESET = {
  vaultAddress: "0x377ca215D07794C904e6B000B25B11934FE5d2f1",
  engineAddress: "0xa2c09C35F91E181e20872706597Ef1E333BB8A1f",
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  circuitBreakerAddress: "0x8f2e3c9B29ebc89785101e8f291b299f5e04d65B",
  sharpeTrackerAddress: "0x6520D0366A43081008049CdD4c87Db3A5ec203B8",
  pegArbExecutorAddress: "0x16D0b61daF75C955784BE0ff9B484F3a095b1408",
  riskPolicyAddress: "0xE15296aB11d75A093A18a7912ad5F93Bc6313cdB",
  asterAdapterAddress: "0x477be4B8485fA3a56Ca7eE6d025A6bDBea1Be35c",
  secondaryAdapterAddress: "0x0E16c32De0272B24E1064C3F069F6b9AE4a13254",
  lpAdapterAddress: "0x0000000000000000000000000000000000000000",
  executionAuctionAddress: "0x6f7ba78e3916AAC9e158E266c786dFbBa99FAa24",
};

// BNB Chain Testnet (Chain ID 97)
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

// Creditcoin Testnet (Chain ID 102031)
export const V2_CREDITCOIN_TESTNET_PRESET = {
  vaultAddress: "0x7c30B24B91Cd9923d565239fA517F3C06371E196",
  engineAddress: "0x3036840C588a51Fe77C4E38a838e5451b1b896Ae",
  tokenAddress: "0xaB4F67AfCb9B9C390049705022A0237E81465C00", // USDT
  circuitBreakerAddress: "0x6b8776492e529fe1e33Df0Af42ffb7430F34660e",
  sharpeTrackerAddress: "0xD47B776e957687D1789d813eBeF79149658d00F0",
  pegArbExecutorAddress: "0x42127f801ff5137ceC8b78573bADc3FCB1Bb10bf",
  riskPolicyAddress: "0x8A7cb0F7e04028EF7cb4189175B29FB370e9A4eC",
  asterAdapterAddress: "0xd5ff531870c75FA29f495e70E0D406a207018D02",
  secondaryAdapterAddress: "0x6f31520271B85b14a035F7e86DeB46A5702Aa871",
  lpAdapterAddress: "0x4Ac2126DceF25CBBB7C09Bbf628233736e3703e9",
  executionAuctionAddress: "0x6470aC20dFeBdFbf4384Fe81Cef96A76EEd6bDb2",
};

// Polkadot Hub Testnet (Paseo Asset Hub, Chain ID 420420417)
// Deployed for Polkadot Solidity Hackathon
export const POLKADOT_HUB_TESTNET_PRESET = {
  vaultAddress: "0x071958E16A54E3a963d17FdeEf2e6938CB8fbB10",
  engineAddress: "0x4dDf07b881Bd0B7cc93deB9D2a7A3c5a6cE094ba",
  tokenAddress: "0x3cCcB5E20193affc9E4C1C1aa5Aee425F0FfB049", // USDC
  circuitBreakerAddress: "0x42127f801ff5137ceC8b78573bADc3FCB1Bb10bf",
  sharpeTrackerAddress: "0xbC3D99421A93e4f2E5bB868DAEC2a03aE96aFD33",
  pegArbExecutorAddress: "0xB9b7A4C7B1f667Ed86814D2Fa576a7D26936e5D8",
  riskPolicyAddress: "0x6470aC20dFeBdFbf4384Fe81Cef96A76EEd6bDb2",
  asterAdapterAddress: "0x4695ef4ADE0D065C8901870876e75fE7b13210E3",
  lpAdapterAddress: "0x76505B830098302e94906Bd5a77B89569bCc7498",
  secondaryAdapterAddress: "0x198E9ECfaA22d8385c386038e810788c9a358c74",
  xcmMessengerAddress: "0x4B1f39ed7B96Ff870fF1B18f2201E21bE75f4eEf",
  executionAuctionAddress: "0xfB2098534961D15056668Ed4824724cB5D84f16F",
};
