// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IManagedAdapter} from "./interfaces/IManagedAdapter.sol";
import {IStableSwapPool} from "./interfaces/IStableSwapPool.sol";
import {IMasterChef} from "./interfaces/IMasterChef.sol";
import {IPancakeRouter} from "./interfaces/IPancakeRouter.sol";

/// @title StableSwapLPYieldAdapterWithFarm
/// @notice 3rd yield rail: deposits USDT into PCS StableSwap pool, stakes LP in MasterChef, harvests CAKE rewards.
/// @dev Coin index 0 = USDF, 1 = USDT in the PCS pool.
///      Implements full "robot route": LP deposit → MasterChef staking → CAKE harvest → swap → redeploy
contract StableSwapLPYieldAdapterWithFarm is Ownable2Step, IManagedAdapter {
    using SafeERC20 for IERC20;

    // ── Immutables ──────────────────────────────────────────────────────────
    IERC20 public immutable usdt;
    IERC20 public immutable lpToken;
    IERC20 public immutable cake;
    IStableSwapPool public immutable pool;
    IMasterChef public immutable masterChef;
    IPancakeRouter public immutable router;
    uint256 public immutable poolId; // MasterChef pool ID for this LP token

    // ── Storage ─────────────────────────────────────────────────────────────
    address public vault;
    bool public configurationLocked;

    // Harvest settings (configurable before lock)
    uint256 public minCakeHarvestAmount; // Min CAKE before swap (gas optimization)
    uint256 public harvestSlippageBps;   // Max slippage for CAKE → USDT swap (in bps)

    // ── Constants ───────────────────────────────────────────────────────────
    uint256 private constant USDT_INDEX = 1;
    uint256 private constant VP_PRECISION = 1e18;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // ── Events ──────────────────────────────────────────────────────────────
    event VaultUpdated(address indexed vaultAddress);
    event LiquidityAdded(uint256 usdtIn, uint256 lpMinted);
    event LiquidityRemoved(uint256 lpBurned, uint256 usdtOut);
    event LPStaked(uint256 lpAmount);
    event LPUnstaked(uint256 lpAmount);
    event RewardsHarvested(uint256 cakeHarvested, uint256 usdtReceived);
    event ConfigurationLocked();
    event HarvestSettingsUpdated(uint256 minCakeAmount, uint256 slippageBps);

    constructor(
        address usdt_,
        address lpToken_,
        address cake_,
        address pool_,
        address masterChef_,
        address router_,
        uint256 poolId_,
        address initialOwner
    ) Ownable(initialOwner) {
        require(usdt_ != address(0), "usdt zero");
        require(lpToken_ != address(0), "lpToken zero");
        require(cake_ != address(0), "cake zero");
        require(pool_ != address(0), "pool zero");
        require(masterChef_ != address(0), "masterChef zero");
        require(router_ != address(0), "router zero");

        usdt = IERC20(usdt_);
        lpToken = IERC20(lpToken_);
        cake = IERC20(cake_);
        pool = IStableSwapPool(pool_);
        masterChef = IMasterChef(masterChef_);
        router = IPancakeRouter(router_);
        poolId = poolId_;

        // Default harvest settings (can be updated before lock)
        minCakeHarvestAmount = 1e18; // 1 CAKE minimum
        harvestSlippageBps = 100;     // 1% max slippage
    }

    modifier onlyVault() {
        require(msg.sender == vault, "only vault");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  IManagedAdapter Implementation
    // ═══════════════════════════════════════════════════════════════════════

    function asset() external view returns (address) {
        return address(usdt);
    }

    /// @notice Returns total USDT value: staked LP (in MasterChef) + unstaked LP + idle USDT
    function managedAssets() external view returns (uint256) {
        // 1. Staked LP in MasterChef
        (uint256 stakedLp, ) = masterChef.userInfo(poolId, address(this));
        
        // 2. Unstaked LP sitting in adapter
        uint256 unstakedLp = lpToken.balanceOf(address(this));
        
        // 3. Total LP = staked + unstaked
        uint256 totalLp = stakedLp + unstakedLp;
        
        // 4. Convert LP to USDT value via virtual_price
        uint256 lpValue = 0;
        if (totalLp > 0) {
            uint256 vp = pool.get_virtual_price(); // 1e18 = $1 per LP
            lpValue = (totalLp * vp) / VP_PRECISION;
        }
        
        // 5. Add idle USDT balance
        uint256 idleUsdt = usdt.balanceOf(address(this));
        
        return lpValue + idleUsdt;
    }

    /// @notice Called by vault after transferring USDT to this adapter.
    ///         Flow: USDT → LP (via pool) → stake LP (via MasterChef)
    function onVaultDeposit(uint256 amount) external onlyVault {
        require(amount > 0, "amount zero");
        
        // 1. Add liquidity to StableSwap pool
        uint256[2] memory amounts;
        amounts[USDT_INDEX] = amount;
        usdt.forceApprove(address(pool), amount);
        uint256 lpMinted = pool.add_liquidity(amounts, 0);
        emit LiquidityAdded(amount, lpMinted);
        
        // 2. Stake LP tokens in MasterChef
        if (lpMinted > 0) {
            lpToken.forceApprove(address(masterChef), lpMinted);
            masterChef.deposit(poolId, lpMinted);
            emit LPStaked(lpMinted);
        }
    }

    /// @notice Removes LP and returns USDT to vault
    ///         Flow: Unstake LP (from MasterChef) → LP → USDT (via pool)
    function withdrawToVault(uint256 amount) external onlyVault returns (uint256) {
        if (amount == 0) return 0;
        
        // 1. Calculate LP needed for requested USDT amount
        uint256 vp = pool.get_virtual_price();
        uint256 lpNeeded = (amount * VP_PRECISION) / vp;
        
        // 2. Check unstaked LP balance first
        uint256 unstakedLp = lpToken.balanceOf(address(this));
        
        // 3. If not enough unstaked LP, withdraw from MasterChef
        if (unstakedLp < lpNeeded) {
            (uint256 stakedLp, ) = masterChef.userInfo(poolId, address(this));
            uint256 toUnstake = lpNeeded - unstakedLp;
            if (toUnstake > stakedLp) toUnstake = stakedLp;
            
            if (toUnstake > 0) {
                masterChef.withdraw(poolId, toUnstake);
                emit LPUnstaked(toUnstake);
            }
        }
        
        // 4. Remove liquidity from pool
        uint256 lpBal = lpToken.balanceOf(address(this));
        if (lpBal == 0) return 0;
        
        uint256 lpToBurn = lpNeeded > lpBal ? lpBal : lpNeeded;
        lpToken.forceApprove(address(pool), lpToBurn);
        uint256 usdtOut = pool.remove_liquidity_one_coin(lpToBurn, int128(int256(USDT_INDEX)), 0);
        
        // 5. Transfer USDT back to vault
        usdt.safeTransfer(vault, usdtOut);
        emit LiquidityRemoved(lpToBurn, usdtOut);
        return usdtOut;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Reward Harvesting (CAKE → USDT → Return to Vault)
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Harvest CAKE rewards from MasterChef, swap to USDT, return to vault
    /// @dev Called by StrategyEngine during executeCycle()
    /// @return usdtReturned USDT amount transferred back to vault
    function harvestRewards() external onlyVault returns (uint256 usdtReturned) {
        // 1. Harvest CAKE by calling deposit(poolId, 0)
        masterChef.deposit(poolId, 0);
        
        // 2. Check harvested CAKE balance
        uint256 cakeBalance = cake.balanceOf(address(this));
        if (cakeBalance < minCakeHarvestAmount) {
            return 0; // Not enough CAKE to justify gas cost
        }
        
        // 3. Swap CAKE → USDT via PancakeSwap router
        address[] memory path = new address[](2);
        path[0] = address(cake);
        path[1] = address(usdt);
        
        // Calculate minimum output with slippage protection
        uint256[] memory amountsOut = router.getAmountsOut(cakeBalance, path);
        uint256 minUsdtOut = amountsOut[1] * (BPS_DENOMINATOR - harvestSlippageBps) / BPS_DENOMINATOR;
        
        cake.forceApprove(address(router), cakeBalance);
        uint256[] memory amounts = router.swapExactTokensForTokens(
            cakeBalance,
            minUsdtOut,
            path,
            address(this),
            block.timestamp + 300 // 5 min deadline
        );
        
        uint256 usdtReceived = amounts[1];
        
        // 4. Transfer USDT back to vault for redeployment
        if (usdtReceived > 0) {
            usdt.safeTransfer(vault, usdtReceived);
        }
        
        emit RewardsHarvested(cakeBalance, usdtReceived);
        return usdtReceived;
    }

    /// @notice Preview pending CAKE rewards without harvesting
    function pendingRewards() external view returns (uint256) {
        return masterChef.pendingCake(poolId, address(this));
    }

    /// @notice Get staking info
    function stakingInfo() external view returns (uint256 staked, uint256 unstaked, uint256 pending) {
        (staked, ) = masterChef.userInfo(poolId, address(this));
        unstaked = lpToken.balanceOf(address(this));
        pending = masterChef.pendingCake(poolId, address(this));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Admin (Configuration Before Lock)
    // ═══════════════════════════════════════════════════════════════════════

    function setVault(address vault_) external onlyOwner {
        require(!configurationLocked, "configuration locked");
        require(vault_ != address(0), "vault zero");
        vault = vault_;
        emit VaultUpdated(vault_);
    }

    function setHarvestSettings(uint256 minCakeAmount_, uint256 slippageBps_) external onlyOwner {
        require(!configurationLocked, "configuration locked");
        require(slippageBps_ <= 1000, "slippage > 10%");
        minCakeHarvestAmount = minCakeAmount_;
        harvestSlippageBps = slippageBps_;
        emit HarvestSettingsUpdated(minCakeAmount_, slippageBps_);
    }

    function lockConfiguration() external onlyOwner {
        require(!configurationLocked, "configuration locked");
        require(vault != address(0), "vault not set");
        configurationLocked = true;
        emit ConfigurationLocked();
        renounceOwnership();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Emergency Functions (callable before renouncing ownership)
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Emergency unstake all LP from MasterChef (before ownership renounced)
    function emergencyUnstakeAll() external onlyOwner {
        (uint256 staked, ) = masterChef.userInfo(poolId, address(this));
        if (staked > 0) {
            masterChef.withdraw(poolId, staked);
            emit LPUnstaked(staked);
        }
    }
}
