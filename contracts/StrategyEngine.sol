// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {ICircuitBreaker} from "./interfaces/ICircuitBreaker.sol";
import {IManagedAdapter} from "./interfaces/IManagedAdapter.sol";
import {IPancakeV3Pool} from "./interfaces/IPancakeV3Pool.sol";
import {RiskPolicy} from "./RiskPolicy.sol";
import {SharpeTracker} from "./SharpeTracker.sol";
import {ProofVault} from "./ProofVault.sol";

/// @title StrategyEngine — Cycle execution with circuit breaker, Dutch auction bounty, and Sharpe tracking
/// @notice Supports 3-rail allocation: Aster, secondary (implicit), and StableSwap LP
/// @custom:security-contact security@asterpilot.xyz
contract StrategyEngine {
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant EWMA_ALPHA = 2000; // 20% weight to new observation (0.20 in BPS)

    // --- Risk State ---
    enum RiskState {
        Normal,
        Guarded,
        Drawdown
    }

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
        bool breakerPaused;
        int256 meanYieldBps;
        uint256 yieldVolatilityBps;
        int256 sharpeRatio;
        uint256 auctionElapsedSeconds;
        uint256 bufferUtilizationBps;
    }

    struct FlashRebalanceData {
        address flashPool;
        address fromAdapter;
        address toAdapter;
        uint256 amount;
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
    event FlashRebalanceRequested(
        address indexed flashPool,
        address indexed fromAdapter,
        address indexed toAdapter,
        uint256 principal
    );
    event FlashRebalanceSettled(
        address indexed flashPool,
        address indexed fromAdapter,
        address indexed toAdapter,
        uint256 principal,
        uint256 fee
    );

    // --- Errors ---
    error StrategyEngine__ZeroAddress();
    error StrategyEngine__ZeroPrice();
    error StrategyEngine__BreakerPaused();
    error StrategyEngine__NotExecutable(bytes32 reason);
    error StrategyEngine__InvalidFlashPool();
    error StrategyEngine__InvalidFlashAmount();
    error StrategyEngine__InvalidFlashCaller();
    error StrategyEngine__InvalidFlashData();
    error StrategyEngine__InvalidFlashAsset();
    error StrategyEngine__NoActiveFlash();
    error StrategyEngine__YieldOverflow();

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
    uint256 public ewmaVolatilityBps;
    bytes32 private activeFlashContextHash;

    constructor(
        address vault_,
        address policy_,
        address oracle_,
        address breaker_,
        address sharpeTracker_,
        uint256 initialPrice_
    ) {
        if (vault_ == address(0)) revert StrategyEngine__ZeroAddress();
        if (policy_ == address(0)) revert StrategyEngine__ZeroAddress();
        if (oracle_ == address(0)) revert StrategyEngine__ZeroAddress();
        if (breaker_ == address(0)) revert StrategyEngine__ZeroAddress();
        if (sharpeTracker_ == address(0)) revert StrategyEngine__ZeroAddress();
        if (initialPrice_ == 0) revert StrategyEngine__ZeroPrice();

        vault = ProofVault(vault_);
        policy = RiskPolicy(policy_);
        priceOracle = IPriceOracle(oracle_);
        circuitBreaker = ICircuitBreaker(breaker_);
        sharpeTracker = SharpeTracker(sharpeTracker_);
        lastPrice = initialPrice_;
    }

    /*//////////////////////////////////////////////////////////////
                             CORE EXECUTION
    //////////////////////////////////////////////////////////////*/

    /// @notice Execute a vault rebalance cycle. Permissionless — anyone can call if canExecute() is true.
    function executeCycle() external {
        _executeCycleInternal(msg.sender, false, FlashRebalanceData(address(0), address(0), address(0), 0));
    }

    /// @notice Execute cycle with Pancake/Uniswap V3 flash-loan assisted adapter shift.
    /// @dev Use this path for regime-shift rebalances when you want deposit->withdraw->repay atomicity.
    function executeCycleWithFlashRebalance(
        address flashPool,
        address fromAdapter,
        address toAdapter,
        uint256 flashAmount
    ) external {
        if (flashPool == address(0)) revert StrategyEngine__InvalidFlashPool();
        if (flashAmount == 0) revert StrategyEngine__InvalidFlashAmount();

        _executeCycleInternal(
            msg.sender,
            true,
            FlashRebalanceData(flashPool, fromAdapter, toAdapter, flashAmount)
        );
    }

    /// @notice Pancake V3 flash callback.
    function pancakeV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        _handleFlashCallback(fee0, fee1, data);
    }

    /// @notice Uniswap V3-compatible callback alias.
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        _handleFlashCallback(fee0, fee1, data);
    }

    /*//////////////////////////////////////////////////////////////
                                  VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if a cycle can be executed
    function canExecute() external view returns (bool, bytes32) {
        if (circuitBreaker.isPaused()) {
            return (false, "BREAKER_PAUSED");
        }
        return _canExecuteInternal();
    }

    /// @notice Full decision preview with all v2 data
    function previewDecision()
        external
        view
        returns (DecisionPreviewV2 memory preview)
    {
        bool breakerPaused = circuitBreaker.isPaused();
        (bool canExec, bytes32 reason) = _canExecuteInternal();

        uint256 price = priceOracle.getPrice();
        uint256 volatility = _previewEwma(_rawVolatilityBps(price, lastPrice));
        RiskState nextState = _selectState(price, volatility);
        (uint256 asterBps, uint256 lpBps) = _selectAllocation(nextState);
        uint256 bountyBps = _auctionBountyBps();

        (int256 meanYield, uint256 yieldVol, int256 sharpe) = sharpeTracker
            .computeSharpe();
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
    function previewAuction()
        external
        view
        returns (
            uint256 currentBountyBps,
            uint256 elapsedSeconds,
            uint256 remainingSeconds,
            uint256 minBountyBps,
            uint256 maxBountyBps
        )
    {
        uint256 elapsed = _auctionElapsed();
        uint256 duration = policy.auctionDurationSeconds();
        currentBountyBps = _auctionBountyBps();
        elapsedSeconds = elapsed;
        remainingSeconds = elapsed >= duration ? 0 : duration - elapsed;
        minBountyBps = policy.minBountyBps();
        maxBountyBps = policy.maxBountyBps();
    }

    /// @notice Preview Sharpe ratio data
    function previewSharpe()
        external
        view
        returns (int256 mean, uint256 volatility, int256 sharpe)
    {
        return sharpeTracker.computeSharpe();
    }

    /// @notice Preview circuit breaker state (no mutation)
    function previewBreaker()
        external
        view
        returns (ICircuitBreaker.BreakerStatus memory)
    {
        return circuitBreaker.previewBreaker();
    }

    /// @notice Time until next cycle is executable
    function timeUntilNextCycle() external view returns (uint256) {
        uint256 nextAllowed = lastExecution + policy.cooldown();
        if (block.timestamp >= nextAllowed) return 0;
        return nextAllowed - block.timestamp;
    }

    /// @notice Risk score 0-100 (higher = riskier)
    /// @dev Computed dynamically from live oracle price so view callers get current risk
    function riskScore() external view returns (uint256) {
        uint256 price = priceOracle.getPrice();
        uint256 volatility = _previewEwma(_rawVolatilityBps(price, lastPrice));
        RiskState liveState = _selectState(price, volatility);

        if (liveState == RiskState.Drawdown) return 100;
        if (liveState == RiskState.Guarded) return 50;

        // In Normal state, factor in Sharpe ratio
        (, , int256 sharpe) = sharpeTracker.computeSharpe();
        if (sharpe < int256(policy.sharpeLowThreshold())) return 30;
        return 0;
    }

    /// @notice Composite vault health score 0–100 (100 = perfect health)
    /// @dev Combines circuit breaker, risk state, Sharpe ratio, and buffer utilization
    /// @return score  0–100 health score
    /// @return label  Human-readable status string
    function vaultHealthScore()
        external
        view
        returns (uint256 score, bytes32 label)
    {
        uint256 s = 100;

        if (circuitBreaker.isPaused()) {
            return (0, "CIRCUIT_BREAKER_TRIPPED");
        }

        if (currentState == RiskState.Drawdown) {
            s -= 40;
        } else if (currentState == RiskState.Guarded) {
            s -= 20;
        }

        (, , int256 sharpe) = sharpeTracker.computeSharpe();
        if (sharpe < int256(policy.sharpeLowThreshold())) {
            s -= 15;
        }

        (uint256 bufferTarget, , uint256 bufferUtil) = vault.bufferStatus();
        if (bufferTarget > 0 && bufferUtil < 5000) {
            s -= 10;
        }

        (bool canExec, ) = _canExecuteInternal();
        if (!canExec) {
            s -= 5;
        }

        if (s >= 90) label = "EXCELLENT";
        else if (s >= 70) label = "HEALTHY";
        else if (s >= 50) label = "CAUTION";
        else if (s >= 25) label = "STRESSED";
        else label = "CRITICAL";

        return (s, label);
    }

    /// @notice Full snapshot of all three yield rails and vault composition
    /// @dev idleUsdt includes Venus-deposited idle (via vault.bufferStatus) for accuracy
    function previewAllRails()
        external
        view
        returns (
            uint256 idleUsdt,
            uint256 asterManaged,
            uint256 secondaryManaged,
            uint256 lpManaged,
            uint256 totalAssets_,
            uint256 asterShareBps,
            uint256 lpShareBps,
            uint256 targetAsterBps_,
            uint256 targetLpBps_
        )
    {
        // bufferStatus.current = _idleAssets() = raw balance + venus underlying
        (, uint256 vaultIdle, ) = vault.bufferStatus();
        idleUsdt = vaultIdle;
        asterManaged = vault.asterAdapter().managedAssets();
        secondaryManaged = vault.secondaryAdapter().managedAssets();
        address lpAddr = address(vault.lpAdapter());
        lpManaged = lpAddr != address(0)
            ? IManagedAdapter(lpAddr).managedAssets()
            : 0;
        // Use vault.totalAssets() for consistency with ERC-4626 share-price basis
        totalAssets_ = vault.totalAssets();

        if (totalAssets_ > 0) {
            asterShareBps = (asterManaged * BPS_DENOMINATOR) / totalAssets_;
            lpShareBps = (lpManaged * BPS_DENOMINATOR) / totalAssets_;
        }

        uint256 price = priceOracle.getPrice();
        uint256 volatility = _previewEwma(_rawVolatilityBps(price, lastPrice));
        RiskState state = _selectState(price, volatility);
        (targetAsterBps_, targetLpBps_) = _selectAllocation(state);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function _executeCycleInternal(
        address executor,
        bool useFlash,
        FlashRebalanceData memory flashData
    ) internal {
        bool breakerPaused = circuitBreaker.checkBreaker();
        if (breakerPaused) revert StrategyEngine__BreakerPaused();

        (bool canExec, bytes32 reason) = _canExecuteInternal();
        if (!canExec) revert StrategyEngine__NotExecutable(reason);

        uint256 price = priceOracle.getPrice();
        uint256 rawVol = _rawVolatilityBps(price, lastPrice);
        uint256 volatility = _updateEwma(rawVol);
        RiskState nextState = _selectState(price, volatility);
        (uint256 asterBps, uint256 lpBps) = _selectAllocation(nextState);
        uint256 bountyBps = _auctionBountyBps();

        _recordSharpeYield();
        _harvestLpRewards();

        if (useFlash) {
            if (nextState == currentState) {
                revert StrategyEngine__NotExecutable("NO_REGIME_SHIFT");
            }
            _requestFlashLoan(flashData);
        }

        vault.rebalance(
            asterBps,
            policy.maxSlippageBps(),
            executor,
            bountyBps,
            lpBps
        );

        (, , uint256 bufferUtil) = vault.bufferStatus();
        (, , int256 sharpe) = sharpeTracker.computeSharpe();

        emit DecisionProofV2(
            executor,
            nextState,
            price,
            lastPrice,
            volatility,
            asterBps,
            lpBps,
            bountyBps,
            false,
            sharpe,
            _auctionElapsed(),
            bufferUtil
        );

        lastPrice = price;
        lastTotalAssets = vault.totalAssets();
        lastExecution = block.timestamp;
        currentState = nextState;
        cycleCount++;
    }

    function _requestFlashLoan(FlashRebalanceData memory flashData) internal {
        if (flashData.amount == 0) revert StrategyEngine__InvalidFlashAmount();
        if (flashData.flashPool == address(0)) revert StrategyEngine__InvalidFlashPool();

        bytes memory callbackData = abi.encode(
            flashData.flashPool,
            flashData.fromAdapter,
            flashData.toAdapter,
            flashData.amount
        );
        activeFlashContextHash = keccak256(callbackData);

        IPancakeV3Pool pool = IPancakeV3Pool(flashData.flashPool);
        address assetToken = vault.asset();
        address token0 = pool.token0();
        address token1 = pool.token1();
        uint256 amount0;
        uint256 amount1;

        if (token0 == assetToken) {
            amount0 = flashData.amount;
        } else if (token1 == assetToken) {
            amount1 = flashData.amount;
        } else {
            revert StrategyEngine__InvalidFlashAsset();
        }

        emit FlashRebalanceRequested(
            flashData.flashPool,
            flashData.fromAdapter,
            flashData.toAdapter,
            flashData.amount
        );

        pool.flash(address(vault), amount0, amount1, callbackData);

        if (activeFlashContextHash != bytes32(0)) {
            revert StrategyEngine__InvalidFlashData();
        }
    }

    function _handleFlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) internal {
        bytes32 expectedHash = activeFlashContextHash;
        if (expectedHash == bytes32(0)) revert StrategyEngine__NoActiveFlash();
        if (keccak256(data) != expectedHash) {
            revert StrategyEngine__InvalidFlashData();
        }

        (
            address flashPool,
            address fromAdapter,
            address toAdapter,
            uint256 amount
        ) = abi.decode(data, (address, address, address, uint256));

        if (msg.sender != flashPool) revert StrategyEngine__InvalidFlashCaller();

        activeFlashContextHash = bytes32(0);

        uint256 fee = fee0 + fee1;
        vault.executeFlashRebalanceStep(
            fromAdapter,
            toAdapter,
            amount,
            amount + fee,
            flashPool
        );

        emit FlashRebalanceSettled(
            flashPool,
            fromAdapter,
            toAdapter,
            amount,
            fee
        );
    }

    function _harvestLpRewards() internal {
        address lpAddr = address(vault.lpAdapter());
        if (lpAddr != address(0)) {
            // Opportunistic harvest — failure is intentionally ignored; never block execution cycle
            (bool _ok,) = lpAddr.call(abi.encodeWithSignature("harvestRewards()"));
            _ok; // suppress "unused local variable" warning
        }
    }

    function _canExecuteInternal() internal view returns (bool, bytes32) {
        if (lastExecution == 0) return (true, "READY");
        if (block.timestamp < lastExecution + policy.cooldown()) {
            return (false, "COOLDOWN_ACTIVE");
        }
        return (true, "READY");
    }

    /// @dev Dutch auction bounty: linearly increases from min to max over auction duration
    function _auctionBountyBps() internal view returns (uint256) {
        uint256 elapsed = _auctionElapsed();
        uint256 duration = policy.auctionDurationSeconds();
        uint256 minB = policy.minBountyBps();
        uint256 maxB = policy.maxBountyBps();

        if (elapsed >= duration) return maxB;
        return minB + ((maxB - minB) * elapsed) / duration;
    }

    /// @dev Seconds since cooldown expired (auction start)
    function _auctionElapsed() internal view returns (uint256) {
        if (lastExecution == 0) return type(uint256).max; // first cycle: full bounty
        uint256 cooldownEnd = lastExecution + policy.cooldown();
        if (block.timestamp <= cooldownEnd) return 0;
        return block.timestamp - cooldownEnd;
    }

    /// @dev Compute raw single-period volatility as absolute % change in bps
    function _rawVolatilityBps(
        uint256 current,
        uint256 previous
    ) internal pure returns (uint256) {
        if (previous == 0) return 0;
        uint256 diff = current > previous
            ? current - previous
            : previous - current;
        return (diff * BPS_DENOMINATOR) / previous;
    }

    /// @dev Update EWMA volatility state and return smoothed value
    function _updateEwma(uint256 rawVol) internal returns (uint256) {
        if (ewmaVolatilityBps == 0) {
            ewmaVolatilityBps = rawVol;
        } else {
            ewmaVolatilityBps = (EWMA_ALPHA * rawVol + (BPS_DENOMINATOR - EWMA_ALPHA) * ewmaVolatilityBps) / BPS_DENOMINATOR;
        }
        return ewmaVolatilityBps;
    }

    /// @dev Preview EWMA volatility without mutating state (for view functions)
    function _previewEwma(uint256 rawVol) internal view returns (uint256) {
        if (ewmaVolatilityBps == 0) return rawVol;
        return (EWMA_ALPHA * rawVol + (BPS_DENOMINATOR - EWMA_ALPHA) * ewmaVolatilityBps) / BPS_DENOMINATOR;
    }

    /// @dev Hysteresis band (bps) to prevent regime thrashing on marginal moves.
    ///      De-escalation requires volatility to drop below threshold minus this band.
    uint256 private constant HYSTERESIS_BPS = 50; // 0.5%
    /// @dev Select risk state based on price and volatility
    function _selectState(
        uint256 price,
        uint256 volatility
    ) internal view returns (RiskState) {
        // Depeg always forces Drawdown (no hysteresis)
        if (price <= policy.depegPrice()) return RiskState.Drawdown;

        // Escalation: use raw thresholds (react quickly to danger)
        // De-escalation: require clearing threshold minus hysteresis band
        uint256 drawdownThreshold = policy.drawdownVolatilityBps();
        uint256 guardedThreshold  = policy.guardedVolatilityBps();

        if (currentState == RiskState.Drawdown) {
            // Stay in Drawdown unless vol drops well below drawdown threshold
            if (volatility >= (drawdownThreshold > HYSTERESIS_BPS ? drawdownThreshold - HYSTERESIS_BPS : 0))
                return RiskState.Drawdown;
            // Dropped enough — check if still Guarded
            if (volatility >= guardedThreshold)
                return RiskState.Guarded;
            return RiskState.Normal;
        }

        if (currentState == RiskState.Guarded) {
            // Escalate to Drawdown at normal threshold
            if (volatility >= drawdownThreshold)
                return RiskState.Drawdown;
            // Stay Guarded unless vol drops well below guarded threshold
            if (volatility >= (guardedThreshold > HYSTERESIS_BPS ? guardedThreshold - HYSTERESIS_BPS : 0))
                return RiskState.Guarded;
            return RiskState.Normal;
        }

        // Normal state: escalate at normal thresholds
        if (volatility >= drawdownThreshold) return RiskState.Drawdown;
        if (volatility >= guardedThreshold)  return RiskState.Guarded;
        return RiskState.Normal;
    }

    /// @dev Select Aster and LP allocation bps based on risk state
    function _selectAllocation(
        RiskState state
    ) internal view returns (uint256 asterBps, uint256 lpBps) {
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
        uint256 currentTotal = vault.totalAssets();
        if (lastTotalAssets == 0) {
            lastTotalAssets = currentTotal;
            return;
        }
        int256 yieldBps;
        if (currentTotal >= lastTotalAssets) {
            yieldBps = int256(
                ((currentTotal - lastTotalAssets) * BPS_DENOMINATOR) /
                    lastTotalAssets
            );
        } else {
            yieldBps = -int256(
                ((lastTotalAssets - currentTotal) * BPS_DENOMINATOR) /
                    lastTotalAssets
            );
        }
        // Cache currentTotal into lastTotalAssets after executeCycle (step 10)
        if (yieldBps > type(int128).max || yieldBps < type(int128).min) {
            revert StrategyEngine__YieldOverflow();
        }
        sharpeTracker.recordYield(int128(yieldBps));
    }
}
