// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICircuitBreaker} from "./interfaces/ICircuitBreaker.sol";
import {IChainlinkAggregator} from "./interfaces/IChainlinkAggregator.sol";
import {IStableSwapPool} from "./interfaces/IStableSwapPool.sol";

/// @title CircuitBreaker — 3-signal auto-pause / auto-recover
/// @notice Trips on ANY single signal. Recovers when ALL clear + cooldown elapsed.
contract CircuitBreaker is ICircuitBreaker {
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ── immutables ──
    IChainlinkAggregator public immutable chainlinkFeed;
    IStableSwapPool      public immutable stableSwapPool;
    uint256 public immutable signalAThresholdBps; // Chainlink USDT/USD deviation
    uint256 public immutable signalBThresholdBps; // reserve-ratio deviation
    uint256 public immutable signalCThresholdBps; // virtual-price drop
    uint256 public immutable recoveryCooldown;     // seconds

    // ── storage ──
    bool    public paused;
    uint256 public lastTripTimestamp;
    uint256 public lastVirtualPrice;

    constructor(
        address _chainlinkFeed,
        address _stableSwapPool,
        uint256 _signalAThresholdBps,
        uint256 _signalBThresholdBps,
        uint256 _signalCThresholdBps,
        uint256 _recoveryCooldown
    ) {
        require(_chainlinkFeed != address(0), "zero feed");
        require(_stableSwapPool != address(0), "zero pool");
        require(_signalAThresholdBps > 0 && _signalAThresholdBps < BPS_DENOMINATOR, "bad sigA");
        require(_signalBThresholdBps > 0 && _signalBThresholdBps < BPS_DENOMINATOR, "bad sigB");
        require(_signalCThresholdBps > 0 && _signalCThresholdBps < BPS_DENOMINATOR, "bad sigC");
        require(_recoveryCooldown > 0, "zero cooldown");

        chainlinkFeed        = IChainlinkAggregator(_chainlinkFeed);
        stableSwapPool       = IStableSwapPool(_stableSwapPool);
        signalAThresholdBps  = _signalAThresholdBps;
        signalBThresholdBps  = _signalBThresholdBps;
        signalCThresholdBps  = _signalCThresholdBps;
        recoveryCooldown     = _recoveryCooldown;

        lastVirtualPrice = IStableSwapPool(_stableSwapPool).get_virtual_price();
    }

    // ── public mutative ──

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

    // ── views ──

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

    // ── internals ──

    function _evaluateSignals()
        internal
        view
        returns (bool sigA, bool sigB, bool sigC, uint256 currentVP)
    {
        // Signal A — Chainlink USDT/USD deviation from $1.00
        (, int256 answer, , , ) = chainlinkFeed.latestRoundData();
        uint256 price  = uint256(answer); // 8 decimals
        uint256 target = 1e8;
        uint256 devA   = price > target ? price - target : target - price;
        sigA = (devA * BPS_DENOMINATOR / target) > signalAThresholdBps;

        // Signal B — StableSwap reserve-ratio deviation from 1:1
        uint256[2] memory bal = stableSwapPool.get_balances();
        uint256 impliedPrice  = bal[0] * 1e18 / bal[1]; // USDT per USDF
        uint256 rTarget       = 1e18;
        uint256 devB = impliedPrice > rTarget
            ? impliedPrice - rTarget
            : rTarget - impliedPrice;
        sigB = (devB * BPS_DENOMINATOR / rTarget) > signalBThresholdBps;

        // Signal C — virtual-price drop
        currentVP = stableSwapPool.get_virtual_price();
        sigC = false;
        if (lastVirtualPrice > 0 && currentVP < lastVirtualPrice) {
            uint256 drop = lastVirtualPrice - currentVP;
            sigC = (drop * BPS_DENOMINATOR / lastVirtualPrice) > signalCThresholdBps;
        }
    }
}
