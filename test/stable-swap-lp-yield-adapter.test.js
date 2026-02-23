const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("StableSwapLPYieldAdapter", function () {
  async function deployFixture() {
    const [deployer, vaultSigner, other] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20.deploy("USDT", "USDT");
    const usdf = await MockERC20.deploy("USDF", "USDF");

    // Deploy the LP-capable mock pool (self-mints LP tokens)
    const MockPool = await ethers.getContractFactory("MockStableSwapPoolWithLPSupport");
    const pool = await MockPool.deploy(
      usdf.target,
      usdt.target,
      ethers.parseUnits("1000000", 18), // USDF balance
      ethers.parseUnits("1000000", 18), // USDT balance
      ethers.parseUnits("1", 18),       // virtualPrice = $1
      4                                  // 0.04% fee
    );

    // Fund pool with tokens so withdrawals work
    await usdt.mint(pool.target, ethers.parseUnits("2000000", 18));
    await usdf.mint(pool.target, ethers.parseUnits("2000000", 18));

    // Deploy adapter — LP token is the pool itself (ERC20)
    const Adapter = await ethers.getContractFactory("StableSwapLPYieldAdapter");
    const adapter = await Adapter.deploy(
      usdt.target,
      pool.target, // lpToken = pool (MockStableSwapPoolWithLPSupport is ERC20)
      pool.target,
      deployer.address
    );

    // Wire vault
    await adapter.setVault(vaultSigner.address);

    // Mint USDT to vault signer for deposits
    await usdt.mint(vaultSigner.address, ethers.parseUnits("100000", 18));
    await usdt.connect(vaultSigner).approve(adapter.target, ethers.MaxUint256);

    return { deployer, vaultSigner, other, usdt, usdf, pool, adapter };
  }

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set asset to USDT", async function () {
      const { adapter, usdt } = await loadFixture(deployFixture);
      expect(await adapter.asset()).to.equal(usdt.target);
    });

    it("should set vault correctly", async function () {
      const { adapter, vaultSigner } = await loadFixture(deployFixture);
      expect(await adapter.vault()).to.equal(vaultSigner.address);
    });

    it("should start with zero managedAssets", async function () {
      const { adapter } = await loadFixture(deployFixture);
      expect(await adapter.managedAssets()).to.equal(0n);
    });

    it("should revert setVault with zero address", async function () {
      const { adapter } = await loadFixture(deployFixture);
      await expect(adapter.setVault(ethers.ZeroAddress)).to.be.revertedWith("vault zero");
    });

    it("should revert constructor with zero usdt", async function () {
      const { pool, deployer } = await loadFixture(deployFixture);
      const Adapter = await ethers.getContractFactory("StableSwapLPYieldAdapter");
      await expect(
        Adapter.deploy(ethers.ZeroAddress, pool.target, pool.target, deployer.address)
      ).to.be.revertedWith("usdt zero");
    });

    it("should revert constructor with zero lpToken", async function () {
      const { usdt, pool, deployer } = await loadFixture(deployFixture);
      const Adapter = await ethers.getContractFactory("StableSwapLPYieldAdapter");
      await expect(
        Adapter.deploy(usdt.target, ethers.ZeroAddress, pool.target, deployer.address)
      ).to.be.revertedWith("lpToken zero");
    });

    it("should revert constructor with zero pool", async function () {
      const { usdt, pool, deployer } = await loadFixture(deployFixture);
      const Adapter = await ethers.getContractFactory("StableSwapLPYieldAdapter");
      await expect(
        Adapter.deploy(usdt.target, pool.target, ethers.ZeroAddress, deployer.address)
      ).to.be.revertedWith("pool zero");
    });
  });

  // ── onVaultDeposit ─────────────────────────────────────────────────────────

  describe("onVaultDeposit", function () {
    it("should add liquidity and mint LP tokens to adapter", async function () {
      const { adapter, vaultSigner, usdt, pool } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 18);

      // Vault transfers USDT to adapter first, then calls onVaultDeposit
      await usdt.connect(vaultSigner).transfer(adapter.target, amount);
      await adapter.connect(vaultSigner).onVaultDeposit(amount);

      expect(await pool.balanceOf(adapter.target)).to.be.gt(0n);
    });

    it("should increase managedAssets after deposit", async function () {
      const { adapter, vaultSigner, usdt } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("5000", 18);

      await usdt.connect(vaultSigner).transfer(adapter.target, amount);
      await adapter.connect(vaultSigner).onVaultDeposit(amount);

      const managed = await adapter.managedAssets();
      // With virtualPrice = 1e18 and no fee on add, should be ~amount
      expect(managed).to.be.gt(0n);
    });

    it("should revert with zero amount", async function () {
      const { adapter, vaultSigner } = await loadFixture(deployFixture);
      await expect(adapter.connect(vaultSigner).onVaultDeposit(0)).to.be.revertedWith("amount zero");
    });

    it("should revert if called by non-vault", async function () {
      const { adapter, other } = await loadFixture(deployFixture);
      await expect(adapter.connect(other).onVaultDeposit(1000n)).to.be.revertedWith("only vault");
    });

    it("should emit LiquidityAdded event", async function () {
      const { adapter, vaultSigner, usdt } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 18);
      await usdt.connect(vaultSigner).transfer(adapter.target, amount);
      await expect(adapter.connect(vaultSigner).onVaultDeposit(amount))
        .to.emit(adapter, "LiquidityAdded");
    });
  });

  // ── withdrawToVault ────────────────────────────────────────────────────────

  describe("withdrawToVault", function () {
    async function depositedFixture() {
      const ctx = await deployFixture();
      const { adapter, vaultSigner, usdt } = ctx;
      const amount = ethers.parseUnits("10000", 18);
      await usdt.connect(vaultSigner).transfer(adapter.target, amount);
      await adapter.connect(vaultSigner).onVaultDeposit(amount);
      return { ...ctx, depositedAmount: amount };
    }

    it("should burn LP and return USDT to vault", async function () {
      const { adapter, vaultSigner, usdt } = await loadFixture(depositedFixture);
      const balBefore = await usdt.balanceOf(vaultSigner.address);
      await adapter.connect(vaultSigner).withdrawToVault(ethers.parseUnits("1000", 18));
      const balAfter = await usdt.balanceOf(vaultSigner.address);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("should return 0 when LP balance is empty", async function () {
      const { adapter, vaultSigner } = await loadFixture(deployFixture);
      const result = await adapter.connect(vaultSigner).withdrawToVault.staticCall(
        ethers.parseUnits("1000", 18)
      );
      expect(result).to.equal(0n);
    });

    it("should return 0 when amount is 0", async function () {
      const { adapter, vaultSigner } = await loadFixture(depositedFixture);
      const result = await adapter.connect(vaultSigner).withdrawToVault.staticCall(0n);
      expect(result).to.equal(0n);
    });

    it("should cap LP burn at full balance when amount exceeds holdings", async function () {
      const { adapter, vaultSigner, usdt, pool } = await loadFixture(depositedFixture);
      const hugAmount = ethers.parseUnits("999999999", 18);
      const balBefore = await usdt.balanceOf(vaultSigner.address);
      await adapter.connect(vaultSigner).withdrawToVault(hugAmount);
      const balAfter = await usdt.balanceOf(vaultSigner.address);
      // LP fully burned, all USDT returned
      expect(await pool.balanceOf(adapter.target)).to.equal(0n);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("should revert if called by non-vault", async function () {
      const { adapter, other } = await loadFixture(depositedFixture);
      await expect(
        adapter.connect(other).withdrawToVault(ethers.parseUnits("100", 18))
      ).to.be.revertedWith("only vault");
    });

    it("should emit LiquidityRemoved event", async function () {
      const { adapter, vaultSigner } = await loadFixture(depositedFixture);
      await expect(adapter.connect(vaultSigner).withdrawToVault(ethers.parseUnits("1000", 18)))
        .to.emit(adapter, "LiquidityRemoved");
    });
  });

  // ── managedAssets valuation ────────────────────────────────────────────────

  describe("managedAssets valuation", function () {
    it("should reflect virtual price appreciation", async function () {
      const { adapter, vaultSigner, usdt, pool } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("10000", 18);
      await usdt.connect(vaultSigner).transfer(adapter.target, amount);
      await adapter.connect(vaultSigner).onVaultDeposit(amount);

      const managedBefore = await adapter.managedAssets();

      // Simulate yield: virtual price increases 1%
      await pool.setVirtualPrice(ethers.parseUnits("1.01", 18));
      const managedAfter = await adapter.managedAssets();

      expect(managedAfter).to.be.gt(managedBefore);
    });

    it("should return 0 when no LP held", async function () {
      const { adapter } = await loadFixture(deployFixture);
      expect(await adapter.managedAssets()).to.equal(0n);
    });
  });

  // ── lockConfiguration ─────────────────────────────────────────────────────

  describe("lockConfiguration", function () {
    it("should lock and renounce ownership", async function () {
      const { adapter } = await loadFixture(deployFixture);
      await adapter.lockConfiguration();
      expect(await adapter.configurationLocked()).to.be.true;
      expect(await adapter.owner()).to.equal(ethers.ZeroAddress);
    });

    it("should revert lockConfiguration if vault not set", async function () {
      const { usdt, pool, deployer } = await loadFixture(deployFixture);
      const Adapter = await ethers.getContractFactory("StableSwapLPYieldAdapter");
      const freshAdapter = await Adapter.deploy(usdt.target, pool.target, pool.target, deployer.address);
      await expect(freshAdapter.lockConfiguration()).to.be.revertedWith("vault not set");
    });

    it("should revert double lock (owner renounced, so OwnableUnauthorizedAccount fires)", async function () {
      const { adapter, deployer } = await loadFixture(deployFixture);
      await adapter.lockConfiguration();
      // Owner is now ZeroAddress; onlyOwner fires before the string check
      await expect(adapter.lockConfiguration())
        .to.be.revertedWithCustomError(adapter, "OwnableUnauthorizedAccount")
        .withArgs(deployer.address);
    });

    it("should revert setVault after lock (owner renounced, so OwnableUnauthorizedAccount fires)", async function () {
      const { adapter, other, deployer } = await loadFixture(deployFixture);
      await adapter.lockConfiguration();
      // Owner is now ZeroAddress; onlyOwner fires before the string check
      await expect(adapter.setVault(other.address))
        .to.be.revertedWithCustomError(adapter, "OwnableUnauthorizedAccount")
        .withArgs(deployer.address);
    });

    it("should emit ConfigurationLocked event", async function () {
      const { adapter } = await loadFixture(deployFixture);
      await expect(adapter.lockConfiguration()).to.emit(adapter, "ConfigurationLocked");
    });
  });

  // ── access control ─────────────────────────────────────────────────────────

  describe("Access control", function () {
    it("should revert setVault from non-owner", async function () {
      const { adapter, other } = await loadFixture(deployFixture);
      await expect(adapter.connect(other).setVault(other.address))
        .to.be.revertedWithCustomError(adapter, "OwnableUnauthorizedAccount");
    });

    it("should revert lockConfiguration from non-owner", async function () {
      const { adapter, other } = await loadFixture(deployFixture);
      await expect(adapter.connect(other).lockConfiguration())
        .to.be.revertedWithCustomError(adapter, "OwnableUnauthorizedAccount");
    });

    it("should emit VaultUpdated on setVault", async function () {
      const { usdt, pool, deployer, other } = await loadFixture(deployFixture);
      const Adapter = await ethers.getContractFactory("StableSwapLPYieldAdapter");
      const freshAdapter = await Adapter.deploy(usdt.target, pool.target, pool.target, deployer.address);
      await expect(freshAdapter.setVault(other.address))
        .to.emit(freshAdapter, "VaultUpdated")
        .withArgs(other.address);
    });
  });
});
