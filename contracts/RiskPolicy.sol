// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RiskPolicy — Immutable policy parameters for StrategyEngine
/// @notice Extends v1 RiskPolicy with Dutch auction bounty, idle buffer, Sharpe ratio params,
///         and LP rail allocation targets per risk state.
///         All values set once at construction; no setters, no owner.

contract RiskPolicy {
    // ── v1 params ───────────────────────────────────────────────
    uint256 public immutable cooldown;
    uint256 public immutable guardedVolatilityBps;
    uint256 public immutable drawdownVolatilityBps;
    uint256 public immutable depegPrice;
    uint256 public immutable maxSlippageBps;
    uint256 public immutable maxBountyBps;
    uint256 public immutable normalAsterBps;
    uint256 public immutable guardedAsterBps;
    uint256 public immutable drawdownAsterBps;

    // ── v2 params ───────────────────────────────────────────────
    uint256 public immutable minBountyBps;
    uint256 public immutable auctionDurationSeconds;
    uint256 public immutable idleBufferBps;
    uint8   public immutable sharpeWindowSize;
    uint256 public immutable sharpeLowThreshold;

    // ── LP rail params ──────────────────────────────────────────
    uint256 public immutable normalLpBps;    // LP allocation in Normal state
    uint256 public immutable guardedLpBps;   // LP allocation in Guarded state
    uint256 public immutable drawdownLpBps;  // LP allocation in Drawdown state

    uint256 public constant BPS_DENOMINATOR = 10_000;

    constructor(
        uint256 cooldown_,
        uint256 guardedVolatilityBps_,
        uint256 drawdownVolatilityBps_,
        uint256 depegPrice_,
        uint256 maxSlippageBps_,
        uint256 maxBountyBps_,
        uint256 normalAsterBps_,
        uint256 guardedAsterBps_,
        uint256 drawdownAsterBps_,
        // v2 additions
        uint256 minBountyBps_,
        uint256 auctionDurationSeconds_,
        uint256 idleBufferBps_,
        uint8   sharpeWindowSize_,
        uint256 sharpeLowThreshold_,
        // LP rail
        uint256 normalLpBps_,
        uint256 guardedLpBps_,
        uint256 drawdownLpBps_
    ) {
        // ── v1 validations ──────────────────────────────────────
        require(cooldown_ > 0, "cooldown=0");
        require(guardedVolatilityBps_ <= drawdownVolatilityBps_, "guarded>drawdown vol");
        require(depegPrice_ > 0, "depeg=0");
        require(maxSlippageBps_ <= 1000, "slippage>10%");
        require(maxBountyBps_ <= 200, "bounty>2%");
        require(normalAsterBps_ <= BPS_DENOMINATOR, "normal>100%");
        require(guardedAsterBps_ <= BPS_DENOMINATOR, "guarded>100%");
        require(drawdownAsterBps_ <= BPS_DENOMINATOR, "drawdown>100%");
        
        // H3 FIX: Allocations should DECREASE as risk increases (Normal -> Guarded -> Drawdown)
        require(
            normalAsterBps_ >= guardedAsterBps_ && guardedAsterBps_ >= drawdownAsterBps_,
            "allocs not monotonic (aster)"
        );

        // ── v2 validations ──────────────────────────────────────
        require(minBountyBps_ <= maxBountyBps_, "minBounty>maxBounty");
        require(auctionDurationSeconds_ > 0, "auctionDuration=0");
        require(idleBufferBps_ <= 2000, "idleBuffer>20%");
        require(sharpeWindowSize_ >= 3 && sharpeWindowSize_ <= 30, "sharpeWindow out of range");

        // ── LP rail validations ─────────────────────────────────
        require(normalLpBps_ + normalAsterBps_ <= 9000, "normal aster+lp > 90%");
        require(guardedLpBps_ + guardedAsterBps_ <= 9000, "guarded aster+lp > 90%");
        require(drawdownLpBps_ + drawdownAsterBps_ <= 9000, "drawdown aster+lp > 90%");
        
        // H3 FIX: LP allocations should also decrease (or stay same) as risk increases
        require(
            normalLpBps_ >= guardedLpBps_ && guardedLpBps_ >= drawdownLpBps_,
            "allocs not monotonic (lp)"
        );

        // ── v1 assignments ──────────────────────────────────────
        cooldown = cooldown_;
        guardedVolatilityBps = guardedVolatilityBps_;
        drawdownVolatilityBps = drawdownVolatilityBps_;
        depegPrice = depegPrice_;
        maxSlippageBps = maxSlippageBps_;
        maxBountyBps = maxBountyBps_;
        normalAsterBps = normalAsterBps_;
        guardedAsterBps = guardedAsterBps_;
        drawdownAsterBps = drawdownAsterBps_;

        // ── v2 assignments ──────────────────────────────────────
        minBountyBps = minBountyBps_;
        auctionDurationSeconds = auctionDurationSeconds_;
        idleBufferBps = idleBufferBps_;
        sharpeWindowSize = sharpeWindowSize_;
        sharpeLowThreshold = sharpeLowThreshold_;

        // ── LP rail assignments ─────────────────────────────────
        normalLpBps = normalLpBps_;
        guardedLpBps = guardedLpBps_;
        drawdownLpBps = drawdownLpBps_;
    }
}
