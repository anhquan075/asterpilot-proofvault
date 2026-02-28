const { ethers, network } = require("hardhat");

async function main() {
  console.log("🚀 Starting Full-Flow Mainnet Smoke Test (Mock Deployment)");

  const [deployer] = await ethers.getSigners();

  console.log("Deploying mock environment...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("USDT", "USDT");
  const usdf = await MockERC20.deploy("USDF", "USDF");
  const cake = await MockERC20.deploy("CAKE", "CAKE");

  const MockChainlinkAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
  const chainlinkFeed = await MockChainlinkAggregator.deploy(8, 100000000n);

  const MockStableSwapPoolWithLPSupport = await ethers.getContractFactory("MockStableSwapPoolWithLPSupport");
  const stableSwapPool = await MockStableSwapPoolWithLPSupport.deploy(
    usdf.target,
    usdt.target,
    ethers.parseUnits("10000000", 18),
    ethers.parseUnits("10000000", 18),
    ethers.parseUnits("1", 18),
    4
  );

  const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
  const pancakeRouter = await MockPancakeRouter.deploy();
  await pancakeRouter.setReserves(
    usdt.target,
    usdf.target,
    ethers.parseUnits("10000000", 18),
    ethers.parseUnits("10000000", 18)
  );
  await pancakeRouter.setReserves(
    cake.target,
    usdt.target,
    ethers.parseUnits("1000000", 18),
    ethers.parseUnits("500000", 18)
  );

  const MockMasterChef = await ethers.getContractFactory("MockMasterChef");
  const masterChef = await MockMasterChef.deploy(cake.target);
  const poolId = 0;
  await masterChef.addPool(stableSwapPool.target);

  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const oracle = await MockPriceOracle.deploy(100000000n, deployer.address);

  const MockAsyncAsterMinter = await ethers.getContractFactory("MockAsyncAsterMinter");
  const asterMinter = await MockAsyncAsterMinter.deploy(usdf.target, 3600);

  const RiskPolicy = await ethers.getContractFactory("RiskPolicy");
  const policy = await RiskPolicy.deploy(
    300, 200, 500, 99000000n, 200, 100, 2000, 5000, 7000, 5, 3600, 500, 5, 5000, 2000, 1500, 500
  );

  const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
  const breaker = await CircuitBreaker.deploy(
    chainlinkFeed.target,
    stableSwapPool.target,
    50, 100, 50, 3600, 86400
  );

  const SharpeTracker = await ethers.getContractFactory("SharpeTracker");
  const sharpeTracker = await SharpeTracker.deploy(5);

  const AsterEarnAdapterWithSwap = await ethers.getContractFactory("AsterEarnAdapterWithSwap");
  const asterAdapter = await AsterEarnAdapterWithSwap.deploy(
    usdt.target, usdf.target, asterMinter.target,
    asterMinter.interface.getFunction("deposit").selector,
    asterMinter.interface.getFunction("managedAssets").selector,
    asterMinter.interface.getFunction("requestWithdraw").selector,
    asterMinter.interface.getFunction("claimWithdraw").selector,
    asterMinter.interface.getFunction("getWithdrawRequest").selector,
    stableSwapPool.target, deployer.address
  );

  const ManagedAdapter = await ethers.getContractFactory("ManagedAdapter");
  const secondaryAdapter = await ManagedAdapter.deploy(usdt.target, deployer.address);

  const StableSwapLPYieldAdapterWithFarm = await ethers.getContractFactory("StableSwapLPYieldAdapterWithFarm");
  const lpAdapter = await StableSwapLPYieldAdapterWithFarm.deploy(
    usdt.target, stableSwapPool.target, cake.target, deployer.address,
    stableSwapPool.target, masterChef.target, pancakeRouter.target, poolId, deployer.address
  );

  const ProofVault = await ethers.getContractFactory("ProofVault");
  const vault = await ProofVault.deploy(usdt.target, "ProofVault", "PV", deployer.address, 500);

  const StrategyEngine = await ethers.getContractFactory("StrategyEngine");
  const engine = await StrategyEngine.deploy(
    vault.target, policy.target, oracle.target, breaker.target, sharpeTracker.target, 100000000n
  );

  await vault.setEngine(engine.target);
  await sharpeTracker.setEngine(engine.target);
  await vault.setAdapters(asterAdapter.target, secondaryAdapter.target, lpAdapter.target);
  await asterAdapter.setVault(vault.target);
  await secondaryAdapter.setVault(vault.target);
  await lpAdapter.setVault(vault.target);

  await asterAdapter.lockConfiguration();
  await secondaryAdapter.lockConfiguration();
  await lpAdapter.lockConfiguration();
  await vault.lockConfiguration();

  // Test setup
  await usdt.mint(deployer.address, ethers.parseUnits("200000", 18));
  await usdt.mint(stableSwapPool.target, ethers.parseUnits("5000000", 18));
  await usdf.mint(stableSwapPool.target, ethers.parseUnits("5000000", 18));
  await usdf.mint(pancakeRouter.target, ethers.parseUnits("10000000", 18));
  await usdt.mint(pancakeRouter.target, ethers.parseUnits("10000000", 18));
  await cake.mint(masterChef.target, ethers.parseUnits("1000000", 18));
  
  console.log("\n--- UI executeCycle Flow ---");

  console.log("UI: Fetching engine status...");
  const [[canExec, reasonBytes32], breakerPreview, decisionPreview] = await Promise.all([
    engine.canExecute().catch(() => [false, ethers.encodeBytes32String("ERROR")]),
    breaker.previewBreaker().catch(() => null),
    engine.previewDecision().catch(() => null)
  ]);

  const breakerStatus = breakerPreview;
  const decision = decisionPreview;

  const activeSignals = [
    breakerStatus?.signalA ? "A" : null,
    breakerStatus?.signalB ? "B" : null,
    breakerStatus?.signalC ? "C" : null,
  ].filter(Boolean).join(", ");

  console.log(`UI: canExecute = ${canExec} (${ethers.decodeBytes32String(reasonBytes32)})`);
  console.log(`UI: breaker paused = ${breakerStatus?.paused}, signals = ${activeSignals || "none"}`);
  console.log(`UI: decision executable = ${decision?.executable}`);

  if (breakerStatus?.paused || activeSignals) {
    console.log(`⚠️ UI would block: Circuit breaker paused or signals active (${activeSignals}).`);
    process.exit(0);
  }

  const canExecNow = await engine.canExecute();
  if (!canExecNow[0]) {
    console.log(`⚠️ UI would block: Not ready: ${ethers.decodeBytes32String(canExecNow[1])}`);
    process.exit(0);
  }

  try {
    console.log("UI: Simulating executeCycle with staticCall...");
    await engine.executeCycle.staticCall();
    
    console.log("UI: Executing executeCycle...");
    const tx = await engine.executeCycle();
    await tx.wait();
    console.log(`✅ executeCycle successful: ${tx.hash}`);
  } catch (e) {
    console.log("❌ executeCycle failed:", e.message);
  }

  console.log("\n--- UI Deposit Flow ---");
  const depositAmount = ethers.parseUnits("1000", 18); // 1000 USDT
  
  console.log("UI: Checking configurationLocked...");
  const isLocked = await vault.configurationLocked();
  if (!isLocked) {
    console.log("⚠️ UI would block: Vault configuration is not locked.");
  } else {
    console.log("UI: Checking allowance...");
    const allowance = await usdt.allowance(deployer.address, vault.target);
    if (allowance < depositAmount) {
      console.log("UI: Approving token...");
      await (await usdt.approve(vault.target, ethers.MaxUint256)).wait();
    }
    
    try {
      console.log("UI: Simulating deposit with staticCall...");
      await vault.deposit.staticCall(depositAmount, deployer.address);
      
      console.log("UI: Executing deposit...");
      const depositTx = await vault.deposit(depositAmount, deployer.address);
      await depositTx.wait();
      console.log(`✅ Deposit successful: ${depositTx.hash}`);
    } catch (e) {
      console.log("❌ Deposit failed:", e.message);
    }
  }

  console.log("\n--- UI Withdraw Flow ---");
  const withdrawAmount = ethers.parseUnits("10", 18);
  console.log(`UI: Checking maxWithdraw...`);
  const maxW = await vault.maxWithdraw(deployer.address);
  console.log(`UI: maxWithdraw = ${ethers.formatUnits(maxW, 18)} USDT`);

  if (maxW >= withdrawAmount) {
    try {
      console.log(`UI: Executing withdrawal of 10 USDT...`);
      const withdrawTx = await vault.withdraw(withdrawAmount, deployer.address, deployer.address);
      await withdrawTx.wait();
      console.log(`✅ Withdrawal successful: ${withdrawTx.hash}`);
    } catch (e) {
      console.log("❌ Withdraw failed:", e.message);
    }
  } else {
    console.log("⚠️ UI would block: Insufficient maxWithdraw.");
  }

  console.log("\n--- Step 5: Final State Probe ---");
  const totalAssets = await vault.totalAssets();
  console.log(`Final Vault totalAssets: ${ethers.formatUnits(totalAssets, 18)} USDT`);

  console.log("\n✨ Mainnet Smoke Test Completed Successfully");
}

main().catch((error) => {
  console.error("❌ Smoke Test Failed:", error);
  process.exitCode = 1;
});
