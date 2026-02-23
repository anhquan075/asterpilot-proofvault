// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {IChainlinkAggregator} from "./interfaces/IChainlinkAggregator.sol";

/// @title ChainlinkPriceOracle
/// @notice Wraps a Chainlink AggregatorV3 feed and normalises the answer to 8 decimal places.
/// @dev Chosen over AMM-based oracles because Chainlink prices are derived from professional
///      market makers and are resistant to flash-loan manipulation. The stalePeriod rejects
///      feeds that have not updated within the allowed window, preventing the engine from
///      acting on stale data during oracle downtime.
///
///      Decimal normalisation: Chainlink feeds vary (8 dec, 18 dec, etc.).
///      This contract converts all feeds to a uniform 8-decimal representation so
///      the StrategyEngine and RiskPolicy can use a consistent fixed-point format.
contract ChainlinkPriceOracle is IPriceOracle {
    /// @notice The underlying Chainlink aggregator feed.
    IChainlinkAggregator public immutable feed;

    /// @notice Maximum age (in seconds) of a price update before it is considered stale.
    uint256 public immutable stalePeriod;

    /// @notice Decimal precision reported by the underlying feed.
    uint8 public immutable feedDecimals;

    /// @param feedAddress Non-zero address of a Chainlink AggregatorV3 contract.
    /// @param stalePeriodSeconds Maximum acceptable price age in seconds (must be > 0).
    constructor(address feedAddress, uint256 stalePeriodSeconds) {
        require(feedAddress != address(0), "feed is zero");
        require(stalePeriodSeconds > 0, "stale period is zero");

        feed = IChainlinkAggregator(feedAddress);
        stalePeriod = stalePeriodSeconds;
        feedDecimals = feed.decimals();
    }

    /// @notice Always returns true — Chainlink oracle configuration is inherently immutable.
    function locked() external pure returns (bool) {
        return true;
    }

    /// @notice Fetch the latest price, validate it, and normalise it to 8 decimal places.
    /// @dev Reverts on: invalid round, non-positive answer, missing timestamp, or stale price.
    /// @return Price in 8-decimal fixed-point (e.g. 1_00000000 = $1.00).
    function getPrice() external view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        require(answeredInRound > 0, "invalid round");
        require(answer > 0, "invalid price");
        require(updatedAt > 0, "missing timestamp");
        require(block.timestamp - updatedAt <= stalePeriod, "stale price");

        uint256 unsignedAnswer = uint256(answer);
        if (feedDecimals == 8) {
            return unsignedAnswer;
        }
        if (feedDecimals > 8) {
            uint256 divisor = 10 ** (feedDecimals - 8);
            return unsignedAnswer / divisor;
        }

        uint256 multiplier = 10 ** (8 - feedDecimals);
        return unsignedAnswer * multiplier;
    }
}
