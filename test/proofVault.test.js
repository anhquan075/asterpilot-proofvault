const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AsterPilot ProofVault", function () {
  async function deployFixture() {
    const [deployer, user, executor] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Mock USDT", "mUSDT");
    await token.waitForDeployment();

    const ManagedAdapter = await ethers.getContractFactory("ManagedAdapter");
    const asterAdapter = await ManagedAdapter.deploy(await token.getAddress(), deployer.address);
    await asterAdapter.waitForDeployment();
    const secondaryAdapter = await ManagedAdapter.deploy(await token.getAddress(), deployer.address);
    await secondaryAdapter.waitForDeployment();

    const ProofVault4626 = await ethers.getContractFactory("ProofVault4626");
    const vault = await ProofVault4626.deploy(
      await token.getAddress(),
      "AsterPilot ProofVault Share",
      "rpUSDT",
      deployer.address
    );
    await vault.waitForDeployment();

    const RiskPolicy = await ethers.getContractFactory("RiskPolicy");
    const policy = await RiskPolicy.deploy(
      1,
      200,
      500,
      ethers.parseUnits("0.97", 8),
      100,
      40,
      7000,
      9000,
      10000
    );
    await policy.waitForDeployment();

    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    const oracle = await MockPriceOracle.deploy(ethers.parseUnits("1", 8), deployer.address);
    await oracle.waitForDeployment();

    const StrategyEngine = await ethers.getContractFactory("StrategyEngine");
    const engine = await StrategyEngine.deploy(
      await vault.getAddress(),
      await policy.getAddress(),
      await oracle.getAddress(),
      ethers.parseUnits("1", 8)
    );
    await engine.waitForDeployment();

    await (await vault.setEngine(await engine.getAddress())).wait();
    await (await vault.setAdapters(await asterAdapter.getAddress(), await secondaryAdapter.getAddress())).wait();
    await (await asterAdapter.setVault(await vault.getAddress())).wait();
    await (await secondaryAdapter.setVault(await vault.getAddress())).wait();
    await (await asterAdapter.lockConfiguration()).wait();
    await (await secondaryAdapter.lockConfiguration()).wait();
    await (await vault.lockConfiguration()).wait();

    await (await token.mint(user.address, ethers.parseUnits("10000", 18))).wait();
    await (await token.connect(user).approve(await vault.getAddress(), ethers.parseUnits("10000", 18))).wait();

    return { deployer, user, executor, token, asterAdapter, secondaryAdapter, vault, policy, oracle, engine };
  }

  async function deployUnlockedFixture() {
    const [deployer, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Mock USDT", "mUSDT");
    await token.waitForDeployment();

    const ManagedAdapter = await ethers.getContractFactory("ManagedAdapter");
    const asterAdapter = await ManagedAdapter.deploy(await token.getAddress(), deployer.address);
    await asterAdapter.waitForDeployment();
    const secondaryAdapter = await ManagedAdapter.deploy(await token.getAddress(), deployer.address);
    await secondaryAdapter.waitForDeployment();

    const ProofVault4626 = await ethers.getContractFactory("ProofVault4626");
    const vault = await ProofVault4626.deploy(
      await token.getAddress(),
      "AsterPilot ProofVault Share",
      "rpUSDT",
      deployer.address
    );
    await vault.waitForDeployment();

    const RiskPolicy = await ethers.getContractFactory("RiskPolicy");
    const policy = await RiskPolicy.deploy(
      300,
      200,
      500,
      ethers.parseUnits("0.97", 8),
      100,
      40,
      7000,
      9000,
      10000
    );
    await policy.waitForDeployment();

    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    const oracle = await MockPriceOracle.deploy(ethers.parseUnits("1", 8), deployer.address);
    await oracle.waitForDeployment();

    const StrategyEngine = await ethers.getContractFactory("StrategyEngine");
    const engine = await StrategyEngine.deploy(
      await vault.getAddress(),
      await policy.getAddress(),
      await oracle.getAddress(),
      ethers.parseUnits("1", 8)
    );
    await engine.waitForDeployment();

    await (await vault.setEngine(await engine.getAddress())).wait();
    await (await vault.setAdapters(await asterAdapter.getAddress(), await secondaryAdapter.getAddress())).wait();
    await (await asterAdapter.setVault(await vault.getAddress())).wait();
    await (await secondaryAdapter.setVault(await vault.getAddress())).wait();

    await (await token.mint(user.address, ethers.parseUnits("1000", 18))).wait();
    await (await token.connect(user).approve(await vault.getAddress(), ethers.parseUnits("1000", 18))).wait();

    return { deployer, user, token, vault, policy, oracle, engine, asterAdapter, secondaryAdapter };
  }

  it("deposits and executes normal allocation", async function () {
    const { user, token, vault, asterAdapter, secondaryAdapter, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("1000", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    const totalAssets = await vault.totalAssets();
    const asterManaged = await asterAdapter.managedAssets();
    const secondaryManaged = await secondaryAdapter.managedAssets();

    expect(totalAssets).to.be.closeTo(ethers.parseUnits("1000", 18), ethers.parseUnits("5", 18));
    expect(asterManaged).to.be.greaterThan(secondaryManaged);

    const shares = await vault.balanceOf(user.address);
    await (await vault.connect(user).redeem(shares, user.address, user.address)).wait();
    const ending = await token.balanceOf(user.address);
    expect(ending).to.be.greaterThan(ethers.parseUnits("9950", 18));
  });

  it("enters guarded state on medium volatility", async function () {
    const { user, vault, asterAdapter, oracle, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("1000", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    await (await oracle.setPrice(ethers.parseUnits("1.03", 8))).wait();
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    await (await engine.executeCycle()).wait();

    expect(await engine.currentState()).to.equal(1);
    expect(await asterAdapter.managedAssets()).to.be.greaterThan(ethers.parseUnits("850", 18));
  });

  it("enters drawdown state on depeg", async function () {
    const { user, vault, asterAdapter, secondaryAdapter, oracle, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("1000", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    await (await oracle.setPrice(ethers.parseUnits("0.90", 8))).wait();
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    await (await engine.executeCycle()).wait();

    expect(await engine.currentState()).to.equal(2);
    expect(await secondaryAdapter.managedAssets()).to.equal(0);
    expect(await asterAdapter.managedAssets()).to.be.greaterThan(ethers.parseUnits("980", 18));
  });

  it("pays bounty to permissionless executor", async function () {
    const { user, executor, vault, token, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("1000", 18), user.address)).wait();

    const before = await token.balanceOf(executor.address);
    await (await engine.connect(executor).executeCycle()).wait();
    const after = await token.balanceOf(executor.address);

    expect(after).to.be.greaterThan(before);
  });

  it("disables owner controls after configuration lock", async function () {
    const { deployer, vault, asterAdapter } = await deployFixture();

    expect(await vault.owner()).to.equal(ethers.ZeroAddress);
    expect(await asterAdapter.owner()).to.equal(ethers.ZeroAddress);

    await expect(vault.connect(deployer).setEngine(deployer.address)).to.be.reverted;
  });

  it("blocks cycle execution when configuration is not locked", async function () {
    const { engine } = await deployUnlockedFixture();
    await expect(engine.executeCycle()).to.be.revertedWith("configuration not locked");
  });

  it("blocks deposit before configuration lock", async function () {
    const { user, vault } = await deployUnlockedFixture();

    await expect(vault.connect(user).deposit(ethers.parseUnits("100", 18), user.address)).to.be.revertedWith(
      "configuration not locked"
    );
  });

  it("rejects adapter configuration with mismatched asset", async function () {
    const { deployer, token, vault, asterAdapter } = await deployUnlockedFixture();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const wrongToken = await MockERC20.deploy("Wrong Asset", "WAS");
    await wrongToken.waitForDeployment();

    const ManagedAdapter = await ethers.getContractFactory("ManagedAdapter");
    const wrongAdapter = await ManagedAdapter.deploy(await wrongToken.getAddress(), deployer.address);
    await wrongAdapter.waitForDeployment();

    expect(await asterAdapter.asset()).to.equal(await token.getAddress());
    expect(await wrongAdapter.asset()).to.equal(await wrongToken.getAddress());

    await expect(vault.setAdapters(await asterAdapter.getAddress(), await wrongAdapter.getAddress())).to.be.revertedWith(
      "secondary asset mismatch"
    );
  });

  it("enforces cooldown before next cycle", async function () {
    const { user, vault, engine, asterAdapter, secondaryAdapter } = await deployUnlockedFixture();

    await (await asterAdapter.lockConfiguration()).wait();
    await (await secondaryAdapter.lockConfiguration()).wait();
    await (await vault.lockConfiguration()).wait();

    await (await vault.connect(user).deposit(ethers.parseUnits("500", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    const [canExecuteNow, reasonNow] = await engine.canExecute();
    expect(canExecuteNow).to.equal(false);
    expect(ethers.decodeBytes32String(reasonNow)).to.equal("COOLDOWN");

    await ethers.provider.send("evm_increaseTime", [300]);
    await ethers.provider.send("evm_mine", []);

    const [canExecuteLater, reasonLater] = await engine.canExecute();
    expect(canExecuteLater).to.equal(true);
    expect(ethers.decodeBytes32String(reasonLater)).to.equal("OK");
  });

  it("enforces exact cooldown boundary", async function () {
    const { user, vault, engine, asterAdapter, secondaryAdapter } = await deployUnlockedFixture();

    await (await asterAdapter.lockConfiguration()).wait();
    await (await secondaryAdapter.lockConfiguration()).wait();
    await (await vault.lockConfiguration()).wait();

    await (await vault.connect(user).deposit(ethers.parseUnits("500", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    await ethers.provider.send("evm_increaseTime", [299]);
    await ethers.provider.send("evm_mine", []);

    const [beforeBoundary, beforeReason] = await engine.canExecute();
    expect(beforeBoundary).to.equal(false);
    expect(ethers.decodeBytes32String(beforeReason)).to.equal("COOLDOWN");

    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    const [atBoundary, atReason] = await engine.canExecute();
    expect(atBoundary).to.equal(true);
    expect(ethers.decodeBytes32String(atReason)).to.equal("OK");
  });

  it("emits decision and allocation proof events on execution", async function () {
    const { user, vault, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("1000", 18), user.address)).wait();

    await expect(engine.executeCycle()).to.emit(engine, "DecisionProof").and.to.emit(vault, "AllocationExecuted");
  });

  it("restricts rebalance to strategy engine only", async function () {
    const { deployer, vault } = await deployFixture();
    await expect(vault.connect(deployer).rebalance(7000, 100, deployer.address, 10)).to.be.revertedWith("only engine");
  });

  it("locks oracle and removes owner in deploy-like flow", async function () {
    const { deployer, oracle } = await deployUnlockedFixture();
    await (await oracle.lock()).wait();
    expect(await oracle.locked()).to.equal(true);
    expect(await oracle.owner()).to.equal(ethers.ZeroAddress);
    await expect(oracle.connect(deployer).setPrice(ethers.parseUnits("1.01", 8))).to.be.reverted;
  });

  it("returns INVALID_PRICE when oracle price becomes zero", async function () {
    const { oracle, engine, vault, asterAdapter, secondaryAdapter, user } = await deployUnlockedFixture();

    await (await asterAdapter.lockConfiguration()).wait();
    await (await secondaryAdapter.lockConfiguration()).wait();
    await (await vault.lockConfiguration()).wait();

    await (await vault.connect(user).deposit(ethers.parseUnits("100", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    await ethers.provider.send("evm_increaseTime", [300]);
    await ethers.provider.send("evm_mine", []);

    const priceSlot = ethers.toBeHex(1, 32);
    await ethers.provider.send("hardhat_setStorageAt", [await oracle.getAddress(), priceSlot, ethers.toBeHex(0, 32)]);

    const [canExecute, reason] = await engine.canExecute();
    expect(canExecute).to.equal(false);
    expect(ethers.decodeBytes32String(reason)).to.equal("INVALID_PRICE");

    await expect(engine.executeCycle()).to.be.revertedWith("cycle unavailable");
  });

  it("exposes deterministic preview decision before execution", async function () {
    const { user, vault, oracle, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("1000", 18), user.address)).wait();

    const normalPreview = await engine.previewDecision();
    expect(normalPreview.executable).to.equal(true);
    expect(normalPreview.nextState).to.equal(0);
    expect(normalPreview.targetAsterBps).to.equal(7000n);
    expect(ethers.decodeBytes32String(normalPreview.reason)).to.equal("OK");

    await (await engine.executeCycle()).wait();

    await (await oracle.setPrice(ethers.parseUnits("1.03", 8))).wait();
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    const guardedPreview = await engine.previewDecision();
    expect(guardedPreview.nextState).to.equal(1);
    expect(guardedPreview.targetAsterBps).to.equal(9000n);
    expect(guardedPreview.volatilityBps).to.be.greaterThan(0n);
  });

  it("rejects non-monotonic allocation policy", async function () {
    const RiskPolicy = await ethers.getContractFactory("RiskPolicy");

    await expect(
      RiskPolicy.deploy(300, 200, 500, ethers.parseUnits("0.97", 8), 100, 40, 8000, 7000, 10000)
    ).to.be.revertedWith("guarded allocation below normal");

    await expect(
      RiskPolicy.deploy(300, 200, 500, ethers.parseUnits("0.97", 8), 100, 40, 7000, 9000, 8500)
    ).to.be.revertedWith("drawdown allocation below guarded");
  });

  it("riskScore returns 0 in calm market", async function () {
    const { engine } = await deployFixture();
    const score = await engine.riskScore();
    expect(score).to.equal(0n);
  });

  it("riskScore rises proportionally with volatility", async function () {
    const { user, vault, oracle, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("100", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    // 10% price move -> vol = 1000 bps -> score = 1000*100/2000 = 50
    await (await oracle.setPrice(ethers.parseUnits("1.10", 8))).wait();
    const score = await engine.riskScore();
    expect(score).to.equal(50n);
  });

  it("riskScore caps at 100 at extreme volatility", async function () {
    const { user, vault, oracle, engine } = await deployFixture();

    await (await vault.connect(user).deposit(ethers.parseUnits("100", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    // 30% price move -> vol = 3000 bps -> capped at 100
    await (await oracle.setPrice(ethers.parseUnits("1.30", 8))).wait();
    const score = await engine.riskScore();
    expect(score).to.equal(100n);
  });

  it("timeUntilNextCycle returns 0 when cooldown has elapsed", async function () {
    const { user, vault, engine, asterAdapter, secondaryAdapter } = await deployUnlockedFixture();

    await (await asterAdapter.lockConfiguration()).wait();
    await (await secondaryAdapter.lockConfiguration()).wait();
    await (await vault.lockConfiguration()).wait();

    await (await vault.connect(user).deposit(ethers.parseUnits("100", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    await ethers.provider.send("evm_increaseTime", [300]);
    await ethers.provider.send("evm_mine", []);

    const remaining = await engine.timeUntilNextCycle();
    expect(remaining).to.equal(0n);
  });

  it("timeUntilNextCycle returns positive value during active cooldown", async function () {
    const { user, vault, engine, asterAdapter, secondaryAdapter } = await deployUnlockedFixture();

    await (await asterAdapter.lockConfiguration()).wait();
    await (await secondaryAdapter.lockConfiguration()).wait();
    await (await vault.lockConfiguration()).wait();

    await (await vault.connect(user).deposit(ethers.parseUnits("100", 18), user.address)).wait();
    await (await engine.executeCycle()).wait();

    // 100 seconds into 300s cooldown
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    const remaining = await engine.timeUntilNextCycle();
    expect(remaining).to.be.greaterThan(0n);
    expect(remaining).to.be.lessThanOrEqual(200n);
  });

  it("rebalance reverts when called directly (not via engine)", async function () {
    const { deployer, user, vault } = await deployFixture();
    await expect(
      vault.connect(deployer).rebalance(10000, 100, deployer.address, 0)
    ).to.be.revertedWith("only engine");
    await expect(
      vault.connect(user).rebalance(7000, 100, user.address, 10)
    ).to.be.revertedWith("only engine");
  });
});
