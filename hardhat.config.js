require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const BNB_TESTNET_RPC_URL = process.env.BNB_TESTNET_RPC_URL || "";
const BNB_MAINNET_RPC_URL = process.env.BNB_MAINNET_RPC_URL || "";
const RAW_PRIVATE_KEY = (process.env.PRIVATE_KEY || "").trim();
const PRIVATE_KEY = RAW_PRIVATE_KEY
  ? (RAW_PRIVATE_KEY.startsWith("0x") ? RAW_PRIVATE_KEY : `0x${RAW_PRIVATE_KEY}`)
  : "";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    bnbTestnet: {
      url: BNB_TESTNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 97,
    },
    bnb: {
      url: BNB_MAINNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 56,
    },
  },
  etherscan: {
    apiKey: process.env.BSCAN_API_KEY || "",
  },
};
