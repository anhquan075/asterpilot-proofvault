// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title SharpeTracker — Rolling on-chain Sharpe ratio tracker
/// @notice Library-style contract storing a circular buffer of yield observations.
///         Computes mean yield, volatility, and a scaled Sharpe ratio for the vault.
/// @dev    Used by StrategyEngine to record per-cycle yield and expose analytics.
///         O(1) per record, O(N) for compute where N = windowSize (max 30).
///
///         recordYield is permissionless: Sharpe data is display-only and does not
///         directly control vault allocations, so manipulation is low-risk.
/// @custom:security-contact security@asterpilot.xyz
contract SharpeTracker {
    uint8 public constant MAX_WINDOW = 30;
    uint8 public constant MIN_WINDOW = 3;
    uint256 public constant SHARPE_SCALE = 10_000;

    // ── errors ──
    error SharpeTracker__WindowOutOfRange();

    int128[30] public observations;
    uint8 public index;
    uint8 public count;
    uint8 public immutable windowSize;

    event YieldRecorded(int128 yieldBps, uint8 count);

    constructor(uint8 windowSize_) {
        if (windowSize_ < MIN_WINDOW || windowSize_ > MAX_WINDOW) revert SharpeTracker__WindowOutOfRange();
        windowSize = windowSize_;
    }

    /*//////////////////////////////////////////////////////////////
                          STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Record a new yield observation (in basis points, signed).
    /// @dev Permissionless — intended to be called by StrategyEngine each cycle.
    ///      Sharpe data is analytics-only and does not gate vault allocations.
    /// @param yieldBps Per-cycle yield: ((totalAssets_now - totalAssets_prev) * 10000) / totalAssets_prev
    function recordYield(int128 yieldBps) external {
        observations[index] = yieldBps;
        index = uint8((uint256(index) + 1) % uint256(windowSize));
        if (count < windowSize) {
            count++;
        }
        emit YieldRecorded(yieldBps, count);
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Compute rolling Sharpe ratio from stored observations
    /// @return mean       Mean yield in bps (signed)
    /// @return volatility Standard deviation in bps (unsigned)
    /// @return sharpe     Sharpe ratio scaled by SHARPE_SCALE; 0 if count < MIN_WINDOW
    function computeSharpe()
        external
        view
        returns (int256 mean, uint256 volatility, int256 sharpe)
    {
        if (count < MIN_WINDOW) {
            return (0, 0, 0);
        }

        // Compute mean
        int256 sum;
        for (uint8 i; i < count; i++) {
            sum += int256(observations[i]);
        }
        mean = sum / int256(uint256(count));

        // Compute variance
        uint256 varianceSum;
        for (uint8 i; i < count; i++) {
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

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Babylonian integer square root
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
