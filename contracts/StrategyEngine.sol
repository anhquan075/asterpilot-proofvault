// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {ICircuitBreaker} from "./interfaces/ICircuitBreaker.sol";
import {IManagedAdapter} from "./interfaces/IManagedAdapter.sol";
import {RiskPolicy} from "./RiskPolicy.sol";
import {SharpeTracker} from "./SharpeTracker.sol";
import {ProofVault} from "./ProofVault.sol";

/// @title StrategyEngine — Cycle execution with circuit breaker, Dutch auction bounty, and Sharpe tracking
/// @notice Supports 3-rail allocation: Aster, secondary (implicit), and StableSwap LP
contract StrategyEngine {

    uint256 public constant BPS_DENOMINATOR = 10_000;

    // --- Risk State ---
    enum RiskState { Normal, Guarded, Drawdown }

    // --- Decision Preview (v2 extended) ---
    struct DecisionPreviewV2 {
        bool executable;
        bytes32 reason;
        RiskState nextState;
        uint256 price;
        uint256 previousPrice;
        uint256 volatilityBps;
        uint256 targetAsterBps;
        uint256 targetLpBps;
        uint256 bountyBps;
        // v2 extensions
        bool breakerPaused;
        int256 meanYieldBps;
        uint256 yieldVolatilityBps;
        int256 sharpeRatio;
        uint256 auctionElapsedSeconds;
        uint256 bufferUtilizationBps;
    }

    // --- Events ---
    event DecisionProofV2(
        address indexed executor,
        RiskState indexed nextState,
        uint256 price,
        uint256 previousPrice,
        uint256 volatilityBps,
        uint256 targetAsterBps,
        uint256 targetLpBps,
        uint256 bountyBps,
        bool breakerPaused,
        int256 sharpeRatio,
        uint256 auctionElapsed,
        uint256 bufferUtilizationBps
    );

    // --- Immutables ---
    ProofVault public immutable vault;
    RiskPolicy public immutable policy;
    IPriceOracle public immutable priceOracle;
    ICircuitBreaker public immutable circuitBreaker;
    SharpeTracker public immutable sharpeTracker;

    // --- State ---
    uint256 public lastExecution;
    uint256 public lastPrice;
    uint256 public lastTotalAssets;
    RiskState public currentState;
    uint256 public cycleCount;

    constructor(
        address vault_,
        address policy_,
        address oracle_,
        address breaker_,
        address sharpeTracker_,
        uint256 initialPrice_
    ) {
        require(vault_ != address(0), "StrategyEngine: zero vault");
        require(policy_ != address(0), "StrategyEngine: zero policy");
        require(oracle_ != address(0), "StrategyEngine: zero oracle");
        require(breaker_ != address(0), "StrategyEngine: zero breaker");
        require(sharpeTracker_ != address(0), "StrategyEngine: zero sharpe");
        require(initialPrice_ > 0, "StrategyEngine: zero price");

        vault = ProofVault(vault_);
        policy = RiskPolicy(policy_);
        priceOracle = IPriceOracle(oracle_);
        circuitBreaker = ICircuitBreaker(breaker_);
        sharpeTracker = SharpeTracker(sharpeTracker_);
        lastPrice = initialPrice_;
        lastTotalAssets = 0;
        currentState = RiskState.Normal;
    }

    // ═══════════════════════════════════════════
    //  Core Execution
    // ═══════════════════════════════════════════

    /// @notice Execute a vault rebalance cycle. Permissionless — anyone can call if canExecute() is true.
    function executeCycle() external {
        // 1. Check circuit breaker (updates breaker state)
        bool breakerPaused = circuitBreaker.checkBreaker();
        require(!breakerPaused, "StrategyEngine: breaker paused");

        // 2. Check cooldown
        (bool canExec, bytes32 reason) = _canExecuteInternal();
        require(canExec, string(abi.encodePacked("StrategyEngine: ", reason)));

        // 3. Get price and compute decision
        uint256 price = priceOracle.getPrice();
        uint256 volatility = _volatilityBps(price, lastPrice);
        RiskState nextState = _selectState(price, volatility);
        (uint256 asterBps, uint256 lpBps) = _selectAllocation(nextState);
        uint256 bountyBps = _auctionBountyBps();

        // 4. Record Sharpe yield observation
        _recordSharpeYield();

        // 5. Harvest LP farm rewards if farm adapter is deployed
        if (address(vault.lpAdapter()) != address(0)) {
            // Try calling harvestRewards() - only farm adapter implements this
            // Use low-level call to avoid reverting if adapter doesn't support harvest
            (bool success, bytes memory returnData) = address(vault.lpAdapter()).call(
                abi.encodeWithSignature("harvestRewards()")
            );
            
            if (success && returnData.length >= 32) {
                // Harvested USDT is now in vault, will be redeployed in rebalance()
                // No event needed here - farm adapter emits RewardsHarvested
            }
            // If call fails (not a farm adapter), silently continue
        }

        // 6. Execute rebalance on vault with all 3 rails
        vault.rebalance(asterBps, policy.maxSlippageBps(), msg.sender, bountyBps, lpBps);

        // 7. Get buffer utilization for event
        (, , uint256 bufferUtil) = vault.bufferStatus();

        // 8. Get Sharpe data for event
        (, , int256 sharpe) = sharpeTracker.computeSharpe();

        // 9. Emit proof event
        emit DecisionProofV2(
            msg.sender,
            nextState,
            price,
            lastPrice,
            volatility,
            asterBps,
            lpBps,
            bountyBps,
            false, // not paused (we passed the check)
            sharpe,
            _auctionElapsed(),
            bufferUtil
        );

        // 10. Update state
        lastPrice = price;
        lastTotalAssets = vault.totalAssets();
        lastExecution = block.timestamp;
        currentState = nextState;
        cycleCount++;
    }

    // ═══════════════════════════════════════════
    //  Views
    // ═══════════════════════════════════════════

    /// @notice Check if a cycle can be executed
    function canExecute() external view returns (bool, bytes32) {
        if (circuitBreaker.isPaused()) {
            return (false, "BREAKER_PAUSED");
        }
        return _canExecuteInternal();
    }

    /// @notice Full decision preview with all v2 data
    function previewDecision() external view returns (DecisionPreviewV2 memory preview) {
        bool breakerPaused = circuitBreaker.isPaused();
        (bool canExec, bytes32 reason) = _canExecuteInternal();

        uint256 price = priceOracle.getPrice();
        uint256 volatility = _volatilityBps(price, lastPrice);
        RiskState nextState = _selectState(price, volatility);
        (uint256 asterBps, uint256 lpBps) = _selectAllocation(nextState);
        uint256 bountyBps = _auctionBountyBps();

        (int256 meanYield, uint256 yieldVol, int256 sharpe) = sharpeTracker.computeSharpe();
        (, , uint256 bufferUtil) = vault.bufferStatus();

        preview = DecisionPreviewV2({
            executable: canExec && !breakerPaused,
            reason: breakerPaused ? bytes32("BREAKER_PAUSED") : reason,
            nextState: nextState,
            price: price,
            previousPrice: lastPrice,
            volatilityBps: volatility,
            targetAsterBps: asterBps,
            targetLpBps: lpBps,
            bountyBps: bountyBps,
            breakerPaused: breakerPaused,
            meanYieldBps: meanYield,
            yieldVolatilityBps: yieldVol,
            sharpeRatio: sharpe,
            auctionElapsedSeconds: _auctionElapsed(),
            bufferUtilizationBps: bufferUtil
        });
    }

    /// @notice Preview Dutch auction bounty state
    function previewAuction() external view returns (
        uint256 currentBountyBps,
        uint256 elapsedSeconds,
        uint256 remainingSeconds,
        uint256 minBountyBps,
        uint256 maxBountyBps
    ) {
        uint256 elapsed = _auctionElapsed();
        uint256 duration = policy.auctionDurationSeconds();
        currentBountyBps = _auctionBountyBps();
        elapsedSeconds = elapsed;
        remainingSeconds = elapsed >= duration ? 0 : duration - elapsed;
        minBountyBps = policy.minBountyBps();
        maxBountyBps = policy.maxBountyBps();
    }

    /// @notice Preview Sharpe ratio data
    function previewSharpe() external view returns (int256 mean, uint256 volatility, int256 sharpe) {
        return sharpeTracker.computeSharpe();
    }

    /// @notice Preview circuit breaker state (no mutation)
    function previewBreaker() external view returns (ICircuitBreaker.BreakerStatus memory) {
        return circuitBreaker.previewBreaker();
    }

    /// @notice Time until next cycle is executable
    function timeUntilNextCycle() external view returns (uint256) {
        uint256 nextAllowed = lastExecution + policy.cooldown();
        if (block.timestamp >= nextAllowed) return 0;
        return nextAllowed - block.timestamp;
    }

    /// @notice Risk score 0-100 (higher = riskier)
    function riskScore() external view returns (uint256) {
        if (currentState == RiskState.Drawdown) return 100;
        if (currentState == RiskState.Guarded) return 50;

        // In Normal state, factor in Sharpe ratio
        (, , int256 sharpe) = sharpeTracker.computeSharpe();
        if (sharpe < int256(policy.sharpeLowThreshold())) return 30;
        return 0;
    }

    /// @notice Composite vault health score 0–100 (100 = perfect health)
    /// @dev Combines circuit breaker, risk state, Sharpe ratio, and buffer utilization
    ///      into a single machine-readable and human-readable metric.
    ///      No competitor offers an equivalent on-chain composite health signal.
    /// @return score  0–100 health score
    /// @return label  Human-readable status string
    function vaultHealthScore() external view returns (uint256 score, bytes32 label) {
        uint256 s = 100;

        // ── Circuit breaker: most severe signal (–50) ────────────────────
        if (circuitBreaker.isPaused()) {
            return (0, "CIRCUIT_BREAKER_TRIPPED");
        }

        // ── Risk state deductions ────────────────────────────────────────
        if (currentState == RiskState.Drawdown) {
            s -= 40;
        } else if (currentState == RiskState.Guarded) {
            s -= 20;
        }

        // ── Sharpe ratio deduction (–15) ─────────────────────────────────
        (, , int256 sharpe) = sharpeTracker.computeSharpe();
        if (sharpe < int256(policy.sharpeLowThreshold())) {
            s -= 15;
        }

        // ── Idle buffer deduction: penalise if buffer < 50% of target ────
        (uint256 bufferTarget, , uint256 bufferUtil) = vault.bufferStatus();
        if (bufferTarget > 0 && bufferUtil < 5000) {
            // bufferUtil is 0–10000 bps of target; below 50% = –10
            s -= 10;
        }

        // ── Cooldown active: slight execution-readiness penalty (–5) ─────
        (bool canExec, ) = _canExecuteInternal();
        if (!canExec) {
            s -= 5;
        }

        // ── Derive label ─────────────────────────────────────────────────
        if (s >= 90)      label = "EXCELLENT";
        else if (s >= 70) label = "HEALTHY";
        else if (s >= 50) label = "CAUTION";
        else if (s >= 25) label = "STRESSED";
        else              label = "CRITICAL";

        return (s, label);
    }

    /// @notice Full snapshot of all three yield rails and vault composition
    /// @dev Provides a single-call view of the entire vault's asset distribution
    ///      for frontend dashboards, analytics, and external integrations.
    /// @return idleUsdt          USDT sitting idle in vault
    /// @return asterManaged      USDT-equivalent inside AsterDEX Earn adapter
    /// @return secondaryManaged  USDT equivalent in secondary rail adapter
    /// @return lpManaged         USDT equivalent in StableSwap LP rail adapter
    /// @return totalAssets_      Sum of all rails
    /// @return asterShareBps     Aster's current share of total (bps)
    /// @return lpShareBps        LP rail's current share of total (bps)
    /// @return targetAsterBps_   Engine's current target for Aster rail
    /// @return targetLpBps_      Engine's current target for LP rail
    function previewAllRails() external view returns (
        uint256 idleUsdt,
        uint256 asterManaged,
        uint256 secondaryManaged,
        uint256 lpManaged,
        uint256 totalAssets_,
        uint256 asterShareBps,
        uint256 lpShareBps,
        uint256 targetAsterBps_,
        uint256 targetLpBps_
    ) {
        idleUsdt         = IERC20(vault.asset()).balanceOf(address(vault));
        asterManaged     = vault.asterAdapter().managedAssets();
        secondaryManaged = vault.secondaryAdapter().managedAssets();
        address lpAddr   = address(vault.lpAdapter());
        lpManaged        = lpAddr != address(0) ? IManagedAdapter(lpAddr).managedAssets() : 0;
        totalAssets_     = idleUsdt + asterManaged + secondaryManaged + lpManaged;

        if (totalAssets_ > 0) {
            asterShareBps = asterManaged * BPS_DENOMINATOR / totalAssets_;
            lpShareBps    = lpManaged    * BPS_DENOMINATOR / totalAssets_;
        }

        uint256 price      = priceOracle.getPrice();
        uint256 volatility = _volatilityBps(price, lastPrice);
        RiskState state    = _selectState(price, volatility);
        (targetAsterBps_, targetLpBps_) = _selectAllocation(state);
    }

    // ═══════════════════════════════════════════
    //  Internal Logic
    // ═══════════════════════════════════════════

    function _canExecuteInternal() internal view returns (bool, bytes32) {
        if (lastExecution == 0) return (true, "FIRST_CYCLE");
        if (block.timestamp < lastExecution + policy.cooldown()) {
            return (false, "COOLDOWN_ACTIVE");
        }
        return (true, "READY");
    }

    /// @notice Dutch auction bounty: linearly increases from min to max over auction duration
    function _auctionBountyBps() internal view returns (uint256) {
        uint256 elapsed = _auctionElapsed();
        uint256 duration = policy.auctionDurationSeconds();
        uint256 minB = policy.minBountyBps();
        uint256 maxB = policy.maxBountyBps();

        if (elapsed >= duration) return maxB;
        return minB + (maxB - minB) * elapsed / duration;
    }

    /// @dev Seconds since cooldown expired (auction start)
    function _auctionElapsed() internal view returns (uint256) {
        if (lastExecution == 0) return 0;
        uint256 cooldownEnd = lastExecution + policy.cooldown();
        if (block.timestamp <= cooldownEnd) return 0;
        return block.timestamp - cooldownEnd;
    }

    /// @dev Compute volatility as absolute % change in bps
    function _volatilityBps(uint256 current, uint256 previous) internal pure returns (uint256) {
        if (previous == 0) return 0;
        uint256 diff = current > previous ? current - previous : previous - current;
        return diff * BPS_DENOMINATOR / previous;
    }

    /// @dev Select risk state based on price and volatility
    function _selectState(uint256 price, uint256 volatility) internal view returns (RiskState) {
        if (price <= policy.depegPrice()) return RiskState.Drawdown;
        if (volatility >= policy.drawdownVolatilityBps()) return RiskState.Drawdown;
        if (volatility >= policy.guardedVolatilityBps()) return RiskState.Guarded;
        return RiskState.Normal;
    }

    /// @dev Select Aster and LP allocation bps based on risk state
    function _selectAllocation(RiskState state) internal view returns (uint256 asterBps, uint256 lpBps) {
        if (state == RiskState.Drawdown) {
            return (policy.drawdownAsterBps(), policy.drawdownLpBps());
        }
        if (state == RiskState.Guarded) {
            return (policy.guardedAsterBps(), policy.guardedLpBps());
        }
        return (policy.normalAsterBps(), policy.normalLpBps());
    }

    /// @dev Record yield observation for Sharpe tracking
    function _recordSharpeYield() internal {
        if (lastTotalAssets == 0) {
            lastTotalAssets = vault.totalAssets();
            return;
        }
        uint256 currentTotal = vault.totalAssets();
        int256 yieldBps;
        if (currentTotal >= lastTotalAssets) {
            yieldBps = int256((currentTotal - lastTotalAssets) * BPS_DENOMINATOR / lastTotalAssets);
        } else {
            yieldBps = -int256((lastTotalAssets - currentTotal) * BPS_DENOMINATOR / lastTotalAssets);
        }
        sharpeTracker.recordYield(int128(yieldBps));
    }
}
