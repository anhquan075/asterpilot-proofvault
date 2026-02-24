// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ICircuitBreaker} from "./interfaces/ICircuitBreaker.sol";
import {IChainlinkAggregator} from "./interfaces/IChainlinkAggregator.sol";
import {IStableSwapPool} from "./interfaces/IStableSwapPool.sol";

/// @title CircuitBreaker — 3-signal auto-pause / auto-recover
/// @notice Trips on ANY single signal. Recovers when ALL clear + cooldown elapsed.
/// @custom:security-contact security@asterpilot.xyz
contract CircuitBreaker is ICircuitBreaker {
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ── immutables ──
    IChainlinkAggregator public immutable chainlinkFeed;
    IStableSwapPool      public immutable stableSwapPool;
    uint256 public immutable signalAThresholdBps; // Chainlink USDT/USD deviation
    uint256 public immutable signalBThresholdBps; // reserve-ratio deviation
    uint256 public immutable signalCThresholdBps; // virtual-price drop
    uint256 public immutable recoveryCooldown;        // seconds
    /// @notice Chainlink answer older than this is treated as stale (trips Signal A conservatively)
    uint256 public constant CHAINLINK_STALE_PERIOD = 3600; // 1 hour

    // ── storage ──
    bool    public paused;
    uint256 public lastTripTimestamp;
    uint256 public lastVirtualPrice;

    // ── errors ──
    error CircuitBreaker__ZeroAddress();
    error CircuitBreaker__InvalidThreshold();
    error CircuitBreaker__ZeroCooldown();
    constructor(
        address _chainlinkFeed,
        address _stableSwapPool,
        uint256 _signalAThresholdBps,
        uint256 _signalBThresholdBps,
        uint256 _signalCThresholdBps,
        uint256 _recoveryCooldown
    ) {
        if (_chainlinkFeed == address(0)) revert CircuitBreaker__ZeroAddress();
        if (_stableSwapPool == address(0)) revert CircuitBreaker__ZeroAddress();
        if (_signalAThresholdBps == 0 || _signalAThresholdBps >= BPS_DENOMINATOR) revert CircuitBreaker__InvalidThreshold();
        if (_signalBThresholdBps == 0 || _signalBThresholdBps >= BPS_DENOMINATOR) revert CircuitBreaker__InvalidThreshold();
        if (_signalCThresholdBps == 0 || _signalCThresholdBps >= BPS_DENOMINATOR) revert CircuitBreaker__InvalidThreshold();
        if (_recoveryCooldown == 0) revert CircuitBreaker__ZeroCooldown();

        chainlinkFeed        = IChainlinkAggregator(_chainlinkFeed);
        stableSwapPool       = IStableSwapPool(_stableSwapPool);
        signalAThresholdBps  = _signalAThresholdBps;
        signalBThresholdBps  = _signalBThresholdBps;
        signalCThresholdBps  = _signalCThresholdBps;
        recoveryCooldown     = _recoveryCooldown;

        lastVirtualPrice = IStableSwapPool(_stableSwapPool).get_virtual_price();
    }

    /*//////////////////////////////////////////////////////////////
                           PUBLIC MUTATIVE
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICircuitBreaker
    function checkBreaker() external returns (bool) {
        (bool sigA, bool sigB, bool sigC, uint256 currentVP) = _evaluateSignals();

        // always track virtual price
        lastVirtualPrice = currentVP;

        bool anyTriggered = sigA || sigB || sigC;

        if (anyTriggered) {
            if (!paused) {
                paused = true;
                lastTripTimestamp = block.timestamp;
                emit BreakerTripped(sigA, sigB, sigC);
            }
        } else if (paused && block.timestamp >= lastTripTimestamp + recoveryCooldown) {
            uint256 duration = block.timestamp - lastTripTimestamp;
            paused = false;
            emit BreakerRecovered(duration);
        }

        return paused;
    }

    /*//////////////////////////////////////////////////////////////
                                 VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICircuitBreaker
    function previewBreaker() external view returns (BreakerStatus memory status) {
        (bool sigA, bool sigB, bool sigC, ) = _evaluateSignals();
        status.paused            = paused;
        status.signalA           = sigA;
        status.signalB           = sigB;
        status.signalC           = sigC;
        status.lastTripTimestamp  = lastTripTimestamp;
        status.recoveryTimestamp  = paused ? lastTripTimestamp + recoveryCooldown : 0;
    }

    /// @inheritdoc ICircuitBreaker
    function isPaused() external view returns (bool) {
        return paused;
    }

    /*//////////////////////////////////////////////////////////////
                              INTERNAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function _evaluateSignals()
        internal
        view
        returns (bool sigA, bool sigB, bool sigC, uint256 currentVP)
    {
        // Signal A — Chainlink USDT/USD deviation from $1.00
        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) =
            chainlinkFeed.latestRoundData();

        // Treat feed as unavailable / stale — default trip signal A to be safe
        bool feedStale = (
            answer <= 0 ||
            updatedAt == 0 ||
            answeredInRound < roundId ||
            block.timestamp - updatedAt > CHAINLINK_STALE_PERIOD
        );

        if (feedStale) {
            sigA = true; // conservative: treat stale/invalid feed as signal
        } else {
            uint256 price  = uint256(answer); // safe: answer > 0 checked above
            uint256 target = 1e8;
            uint256 devA   = price > target ? price - target : target - price;
            sigA = (devA * BPS_DENOMINATOR / target) > signalAThresholdBps;
        }

        // Signal B — StableSwap reserve-ratio deviation from 1:1
        uint256[2] memory bal = stableSwapPool.get_balances();
        if (bal[1] == 0) {
            sigB = true; // empty pool is a trip condition
        } else {
            uint256 impliedPrice = bal[0] * 1e18 / bal[1]; // USDT per USDF
            uint256 rTarget      = 1e18;
            uint256 devB = impliedPrice > rTarget
                ? impliedPrice - rTarget
                : rTarget - impliedPrice;
            sigB = (devB * BPS_DENOMINATOR / rTarget) > signalBThresholdBps;
        }

        // Signal C — virtual-price drop
        currentVP = stableSwapPool.get_virtual_price();
        sigC = false;
        if (lastVirtualPrice > 0 && currentVP < lastVirtualPrice) {
            uint256 drop = lastVirtualPrice - currentVP;
            sigC = (drop * BPS_DENOMINATOR / lastVirtualPrice) > signalCThresholdBps;
        }
    }
}
