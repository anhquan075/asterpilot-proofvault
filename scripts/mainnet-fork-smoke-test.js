
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

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
          jsonRpcUrl: "https://bscrpc.com",
        },
      },
    ],
  });

  const [deployer] = await ethers.getSigners();

  // Mainnet Addresses
  const USDT = "0x55d398326f99059fF775485246999027B3197955";
  const USDF = "0x5A110fC00474038f6c02E89C707D638602EA44B5";
  const PANCAKE_STABLE_POOL = "0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57";
  const ASTER_MINTER = "0xdB57a53C428a9faFcbFefFB6dd80d0f427543695";

  // 1. Deploy fixed contracts on fork
  const AsterAdapter = await ethers.getContractFactory("AsterEarnAdapterWithSwap");
  const asterAdapter = await AsterAdapter.deploy(
    USDT,
    USDF,
    ASTER_MINTER,
    "0xb6b55f25",
    "0xad1728cb",
    "0x9ee679e8",
    "0x712679e8",
    "0x88d5b31a",
    PANCAKE_STABLE_POOL,
    deployer.address
  );

  const ManagedAdapter = await ethers.getContractFactory("ManagedAdapter");
  const secondaryAdapter = await ManagedAdapter.deploy(USDT, deployer.address);

  const Vault = await ethers.getContractFactory("ProofVault");
  const vault = await Vault.deploy(
    USDT,
    "Mainnet Fork Vault",
    "mfV",
    deployer.address,
    500
  );

  // 2. Wire and Lock
  await vault.setAdapters(
    asterAdapter.target,
    secondaryAdapter.target,
    ethers.ZeroAddress
  );
  await asterAdapter.setVault(vault.target);
  await secondaryAdapter.setVault(vault.target);

  // Use a dummy engine for simple rebalance call
  await vault.setEngine(deployer.address);
  await asterAdapter.lockConfiguration();
  await secondaryAdapter.lockConfiguration();
  await vault.lockConfiguration();

  // 3. Impersonate a USDT whale for funding
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

  // 4. Test Deposit
  await usdt.approve(vault.target, depositAmount);
  await vault.deposit(depositAmount, deployer.address);
  console.log("✅ Mainnet Fork: Deposit successful");

  // 5. Test Rebalance (Verifies StableSwap Indices 1 -> 0)
  console.log("Mainnet Fork: Executing rebalance to Aster (USDT -> USDF swap)...");
  // We'll allocate 50% to Aster
  await vault.rebalance(5000, 200, deployer.address, 0, 0);

  const asterAssets = await asterAdapter.managedAssets();
  console.log(`✅ Mainnet Fork: Aster Managed Assets = ${ethers.formatUnits(asterAssets, 18)} USDF/USDT`);
  
  if (asterAssets > 0n) {
      console.log("✨ Mainnet Fork Smoke Test Passed!");
  } else {
      console.error("❌ Mainnet Fork Smoke Test Failed: asterAssets is 0");
  }
}

main().catch((error) => {
  console.error("❌ Mainnet Fork Smoke Test Failed:", error);
  process.exitCode = 1;
});
