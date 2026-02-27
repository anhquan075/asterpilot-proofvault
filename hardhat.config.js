require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const BNB_TESTNET_RPC_URL = process.env.BNB_TESTNET_RPC_URL || "";
const BNB_MAINNET_RPC_URL = process.env.BNB_MAINNET_RPC_URL || "";
const RAW_PRIVATE_KEY = (process.env.PRIVATE_KEY || "").trim();
const PRIVATE_KEY = RAW_PRIVATE_KEY
  ? RAW_PRIVATE_KEY.startsWith("0x")
    ? RAW_PRIVATE_KEY
    : `0x${RAW_PRIVATE_KEY}`
  : "";

// Gas price constants (in wei)
// BSC mainnet minimum is 3 gwei; set explicitly so hardhat never
// over-estimates during busy blocks. Override via env for flexibility.
const GAS_PRICE_MAINNET =
  parseInt(process.env.GAS_PRICE_GWEI || "3") * 1_000_000_000;
const GAS_PRICE_TESTNET =
  parseInt(process.env.GAS_PRICE_GWEI || "3") * 1_000_000_000;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        // runs=50: smaller bytecode than 200 → cheaper deployment.
        // Trade-off: ~5-10% higher execution gas per call vs runs=200.
        // Acceptable for a vault deployed rarely but called frequently enough
        // that execution gas still matters — 50 is the practical sweet spot.
        runs: 50,
      },
    },
  },
  networks: {
    // Fork mode is opt-in via ENABLE_MAINNET_FORK=true to avoid slowing down
    // the unit test suite. Usage:
    //   ENABLE_MAINNET_FORK=true npx hardhat run scripts/fork-test-mainnet.js --network hardhat
    hardhat:
      BNB_MAINNET_RPC_URL && process.env.ENABLE_MAINNET_FORK === "true"
        ? {
            forking: {
              // Use an archive-capable endpoint. The default bsc-dataseed.bnbchain.org
              // is a pruned full node — it fails with "missing trie node".
              // Override via BNB_ARCHIVE_RPC_URL (e.g. a NodeReal/Alchemy key).
              url:
                process.env.BNB_ARCHIVE_RPC_URL ||
                "https://bsc-mainnet.public.blastapi.io",
            },
            // BSC mainnet chain ID — required so Hardhat picks correct hardfork rules.
            chainId: 56,
            // BSC follows Berlin/London EVM; use "berlin" to avoid missing EIP-1559 issues.
            hardfork: "berlin",
          }
        : {},
    bnbTestnet: {
      url: BNB_TESTNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: GAS_PRICE_TESTNET,
    },
    bnb: {
      url: BNB_MAINNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: GAS_PRICE_MAINNET,
    },
  },
  etherscan: {
    apiKey: process.env.BSCAN_API_KEY || "",
  },
};
