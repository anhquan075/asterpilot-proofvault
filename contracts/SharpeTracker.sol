// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SharpeTracker — Rolling on-chain Sharpe ratio tracker
/// @notice Library-style contract storing a circular buffer of yield observations.
///         Computes mean yield, volatility, and a scaled Sharpe ratio for the vault.
/// @dev    Used by StrategyEngine to record per-cycle yield and expose analytics.
///         O(1) per record, O(N) for compute where N = windowSize (max 30).

contract SharpeTracker {
    uint8 public constant MAX_WINDOW = 30;
    uint8 public constant MIN_WINDOW = 3;
    uint256 public constant SHARPE_SCALE = 10_000;

    int128[30] public observations;
    uint8 public index;
    uint8 public count;
    uint8 public immutable windowSize;
    address public immutable engine;

    event YieldRecorded(int128 yieldBps, uint8 count);

    modifier onlyEngine() {
        require(msg.sender == engine, "only engine");
        _;
    }

    constructor(uint8 windowSize_, address engine_) {
        require(windowSize_ >= MIN_WINDOW && windowSize_ <= MAX_WINDOW, "window out of range");
        require(engine_ != address(0), "zero engine");
        windowSize = windowSize_;
        engine = engine_;
    }

    /// @notice Record a new yield observation (in basis points, signed)
    /// @param yieldBps Per-cycle yield: ((totalAssets_now - totalAssets_prev) * 10000) / totalAssets_prev
    function recordYield(int128 yieldBps) external onlyEngine {
        observations[index] = yieldBps;
        index = uint8((uint256(index) + 1) % uint256(windowSize));
        if (count < windowSize) {
            count++;
        }
        emit YieldRecorded(yieldBps, count);
    }

    /// @notice Compute rolling Sharpe ratio from stored observations
    /// @return mean Mean yield in bps (signed)
    /// @return volatility Standard deviation in bps (unsigned)
    /// @return sharpe Sharpe ratio scaled by SHARPE_SCALE (mean * SHARPE_SCALE / stddev), 0 if count < MIN_WINDOW
    function computeSharpe()
        external
        view
        returns (int256 mean, uint256 volatility, int256 sharpe)
    {
        if (count < MIN_WINDOW) {
            return (0, 0, 0);
        }

        // Compute mean
        int256 sum = 0;
        for (uint8 i = 0; i < count; i++) {
            sum += int256(observations[i]);
        }
        mean = sum / int256(uint256(count));

        // Compute variance
        uint256 varianceSum = 0;
        for (uint8 i = 0; i < count; i++) {
            int256 diff = int256(observations[i]) - mean;
            varianceSum += uint256(diff * diff);
        }
        uint256 variance = varianceSum / uint256(count);

        // Standard deviation via Babylonian sqrt
        volatility = _sqrt(variance);

        // Sharpe = mean * SHARPE_SCALE / stddev
        if (volatility == 0) {
            sharpe = mean > 0 ? int256(SHARPE_SCALE) : (mean < 0 ? -int256(SHARPE_SCALE) : int256(0));
        } else {
            sharpe = (mean * int256(SHARPE_SCALE)) / int256(volatility);
        }
    }

    /// @notice Get the latest N observations (oldest to newest)
    /// @return obs Array of recorded yield observations
    /// @return len Number of valid entries
    function getObservations()
        external
        view
        returns (int128[30] memory obs, uint8 len)
    {
        obs = observations;
        len = count;
    }

    /// @dev Babylonian integer square root
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
