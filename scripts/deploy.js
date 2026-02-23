const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const initialPrice = hre.ethers.parseUnits("1", 8);

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Mock USDT", "mUSDT");
  await token.waitForDeployment();

  const ManagedAdapter = await hre.ethers.getContractFactory("ManagedAdapter");
  const asterAdapter = await ManagedAdapter.deploy(await token.getAddress(), deployer.address);
  await asterAdapter.waitForDeployment();
  const secondaryAdapter = await ManagedAdapter.deploy(await token.getAddress(), deployer.address);
  await secondaryAdapter.waitForDeployment();

  const ProofVault4626 = await hre.ethers.getContractFactory("ProofVault4626");
  const vault = await ProofVault4626.deploy(
    await token.getAddress(),
    "AsterPilot ProofVault Share",
    "rpUSDT",
    deployer.address
  );
  await vault.waitForDeployment();

  const RiskPolicy = await hre.ethers.getContractFactory("RiskPolicy");
  const policy = await RiskPolicy.deploy(
    300,
    150,
    500,
    hre.ethers.parseUnits("0.97", 8),
    100,
    50,
    7000,
    9000,
    10000
  );
  await policy.waitForDeployment();

  const MockPriceOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  const oracle = await MockPriceOracle.deploy(initialPrice, deployer.address);
  await oracle.waitForDeployment();

  const StrategyEngine = await hre.ethers.getContractFactory("StrategyEngine");
  const engine = await StrategyEngine.deploy(
    await vault.getAddress(),
    await policy.getAddress(),
    await oracle.getAddress(),
    initialPrice
  );
  await engine.waitForDeployment();

  await (await vault.setEngine(await engine.getAddress())).wait();
  await (await vault.setAdapters(await asterAdapter.getAddress(), await secondaryAdapter.getAddress())).wait();
  await (await asterAdapter.setVault(await vault.getAddress())).wait();
  await (await secondaryAdapter.setVault(await vault.getAddress())).wait();
  await (await asterAdapter.lockConfiguration()).wait();
  await (await secondaryAdapter.lockConfiguration()).wait();
  await (await oracle.lock()).wait();
  await (await vault.lockConfiguration()).wait();

  console.log("Deployer:", deployer.address);
  console.log("MockUSDT:", await token.getAddress());
  console.log("AsterAdapter:", await asterAdapter.getAddress());
  console.log("SecondaryAdapter:", await secondaryAdapter.getAddress());
  console.log("Vault:", await vault.getAddress());
  console.log("RiskPolicy:", await policy.getAddress());
  console.log("Oracle:", await oracle.getAddress());
  console.log("Oracle locked:", await oracle.locked());
  console.log("StrategyEngine:", await engine.getAddress());
  console.log("Vault owner (expected zero):", await vault.owner());
  console.log("AsterAdapter owner (expected zero):", await asterAdapter.owner());
  console.log("SecondaryAdapter owner (expected zero):", await secondaryAdapter.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
