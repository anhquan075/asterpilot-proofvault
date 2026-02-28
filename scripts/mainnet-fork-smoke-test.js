
const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const contractAddresses = require("../frontend/lib/contractAddresses");

async function main() {
  if (network.name !== "hardhat") {
    console.error("This script must be run on the Hardhat network with mainnet forking enabled.");
    return;
  }

  console.log("🚀 Starting Mainnet Fork Smoke Test...");
  
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: process.env.BNB_ARCHIVE_NODE_URL || "https://bscrpc.com",
        },
      },
    ],
  });

  const [deployer] = await ethers.getSigners();

  // Mainnet Addresses
  const USDT = contractAddresses.V2_MAINNET_PRESET.tokenAddress;
  const USDF = "0x5A110fC00474038f6c02E89C707D638602EA44B5";
  const PANCAKE_STABLE_POOL = "0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57";

  // Deploying fresh for the fork test to test components, or we can use the deployed ones
  // We will test the deployed V2 contracts on mainnet by impersonating the Engine to call rebalance, 
  // or impersonating a user to deposit and calling executeCycle.
  
  const vaultAddr = contractAddresses.V2_MAINNET_PRESET.vaultAddress;
  const engineAddr = contractAddresses.V2_MAINNET_PRESET.engineAddress;
  const asterAdapterAddr = contractAddresses.V2_MAINNET_PRESET.asterAdapterAddress;
  
  const vault = await ethers.getContractAt("ProofVault", vaultAddr);
  const engine = await ethers.getContractAt("StrategyEngine", engineAddr);
  const asterAdapter = await ethers.getContractAt("AsterEarnAdapterWithSwap", asterAdapterAddr);

  // Impersonate a USDT whale for funding
  const WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC"; // Binance 8
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE],
  });
  const whaleSigner = await ethers.getSigner(WHALE);

  // Give whale some BNB for gas
  await deployer.sendTransaction({ to: WHALE, value: ethers.parseEther("1") });

  const usdt = await ethers.getContractAt("IERC20", USDT);
  const depositAmount = ethers.parseUnits("1000", 18);
  await usdt.connect(whaleSigner).transfer(deployer.address, depositAmount);

  // Test Deposit
  await usdt.approve(vault.target, depositAmount);
  await vault.deposit(depositAmount, deployer.address);
  console.log("✅ Mainnet Fork: Deposit successful");

  // Test Execute Cycle via Engine (which calls rebalance)
  console.log("Mainnet Fork: Executing cycle (USDT -> USDF swap)...");
  
  const canExec = await engine.canExecute();
  console.log("Can execute?", canExec[0], ethers.decodeBytes32String(canExec[1]));
  
  if (canExec[0]) {
      const tx = await engine.executeCycle();
      await tx.wait();
      console.log("✅ Mainnet Fork: executeCycle successful");
  } else {
      console.log("Skipping executeCycle because engine is not ready (Cooldown or Breaker).");
  }

  const asterAssets = await asterAdapter.managedAssets();
  console.log(`✅ Mainnet Fork: Aster Managed Assets = ${ethers.formatUnits(asterAssets, 18)} USDF/USDT`);

  console.log("✨ Mainnet Fork Smoke Test Passed!");
}

main().catch((error) => {
  console.error("❌ Mainnet Fork Smoke Test Failed:", error);
  process.exitCode = 1;
});
