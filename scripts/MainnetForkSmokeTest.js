const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const contractAddresses = require("../frontend/lib/contractAddresses");

async function main() {
  if (network.name !== "hardhat") {
    console.error("This script must be run on the Hardhat network with mainnet forking enabled.");
    return;
  }

  console.log("🚀 Starting Mainnet Fork Smoke Test on NEW Addresses...");
  
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: process.env.BNB_ARCHIVE_NODE_URL || process.env.BNB_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org",
        },
      },
    ],
  });

  const [deployer] = await ethers.getSigners();

  const vaultAddr = contractAddresses.V2_MAINNET_PRESET.vaultAddress;
  const engineAddr = contractAddresses.V2_MAINNET_PRESET.engineAddress;
  const usdtAddr = contractAddresses.V2_MAINNET_PRESET.tokenAddress;
  
  const vault = await ethers.getContractAt("ProofVault", vaultAddr);
  const engine = await ethers.getContractAt("StrategyEngine", engineAddr);
  const usdt = await ethers.getContractAt("IERC20", usdtAddr);

  // 1. Impersonate a USDT whale for funding
  const WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC"; // Binance 8
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE],
  });
  const whaleSigner = await ethers.getSigner(WHALE);
  await deployer.sendTransaction({ to: WHALE, value: ethers.parseEther("1") });

  const depositAmount = ethers.parseUnits("1000", 18);
  await usdt.connect(whaleSigner).transfer(deployer.address, depositAmount);

  // 2. Test Deposit
  console.log("Testing Deposit...");
  await usdt.approve(vault.target, depositAmount);
  await vault.deposit(depositAmount, deployer.address);
  console.log("✅ Deposit successful");

  // 3. Test Execute Cycle
  console.log("Testing executeCycle...");
  const canExec = await engine.canExecute();
  if (!canExec[0]) {
      const timeUntil = await engine.timeUntilNextCycle();
      console.log(`Fast-forwarding time by ${timeUntil}s...`);
      await ethers.provider.send("evm_increaseTime", [Number(timeUntil) + 10]);
      await ethers.provider.send("evm_mine");
  }

  // Fund the caller for gas
  const tx = await engine.executeCycle();
  await tx.wait();
  console.log("✅ executeCycle successful");

  const totalAssets = await vault.totalAssets();
  console.log(`Final Vault totalAssets: ${ethers.formatUnits(totalAssets, 18)} USDT`);
  
  expect(totalAssets).to.be.gt(0);
  console.log("✨ Mainnet Fork Smoke Test PASSED on live addresses!");
}

main().catch((error) => {
  console.error("❌ Mainnet Fork Smoke Test Failed:", error);
  process.exitCode = 1;
});
