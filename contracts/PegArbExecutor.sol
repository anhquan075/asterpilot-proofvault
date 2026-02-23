// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPegArbExecutor} from "./interfaces/IPegArbExecutor.sol";
import {IStableSwapPool} from "./interfaces/IStableSwapPool.sol";
import {IUSDFMinting} from "./interfaces/IUSDFMinting.sol";

/// @title PegArbExecutor — permissionless atomic USDF/USDT arb
/// @notice Detects peg deviation, executes arb, pays bounty, returns profit to vault.
contract PegArbExecutor is IPegArbExecutor {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ── immutables ──
    address public immutable vault;
    IERC20  public immutable usdt;
    IERC20  public immutable usdf;
    IUSDFMinting    public immutable usdfMinting;
    IStableSwapPool public immutable stableSwapPool;
    uint256 public immutable minProfitBps;
    uint256 public immutable maxArbBps;
    uint256 public immutable arbBountyBps;
    uint256 public immutable deviationThresholdBps;

    constructor(
        address _vault,
        address _usdt,
        address _usdf,
        address _usdfMinting,
        address _stableSwapPool,
        uint256 _minProfitBps,
        uint256 _maxArbBps,
        uint256 _arbBountyBps,
        uint256 _deviationThresholdBps
    ) {
        require(_vault != address(0), "zero vault");
        require(_usdt != address(0), "zero usdt");
        require(_usdf != address(0), "zero usdf");
        require(_usdfMinting != address(0), "zero minting");
        require(_stableSwapPool != address(0), "zero pool");
        require(_minProfitBps > 0 && _minProfitBps <= BPS_DENOMINATOR, "bad minProfit");
        require(_maxArbBps > 0 && _maxArbBps <= BPS_DENOMINATOR, "bad maxArb");
        require(_arbBountyBps <= BPS_DENOMINATOR, "bad bounty");
        require(_deviationThresholdBps > 0 && _deviationThresholdBps <= BPS_DENOMINATOR, "bad dev");

        vault                = _vault;
        usdt                 = IERC20(_usdt);
        usdf                 = IERC20(_usdf);
        usdfMinting          = IUSDFMinting(_usdfMinting);
        stableSwapPool       = IStableSwapPool(_stableSwapPool);
        minProfitBps         = _minProfitBps;
        maxArbBps            = _maxArbBps;
        arbBountyBps         = _arbBountyBps;
        deviationThresholdBps = _deviationThresholdBps;
    }

    // ── views ──

    /// @inheritdoc IPegArbExecutor
    function previewArb() external view returns (ArbPreview memory preview) {
        (uint256 poolPrice, ArbDirection dir) = _detectDirection();
        preview.poolPrice  = poolPrice;
        preview.direction  = dir;

        if (dir == ArbDirection.None) return preview;

        uint256 vaultBal   = usdt.balanceOf(vault);
        preview.tradeSize  = vaultBal * maxArbBps / BPS_DENOMINATOR;

        uint256 deviation  = poolPrice > 1e18
            ? poolPrice - 1e18
            : 1e18 - poolPrice;
        // rough profit estimate: deviation minus ~8 bps fees
        uint256 feeBps     = 8;
        preview.estimatedProfitBps = deviation * BPS_DENOMINATOR / 1e18 > feeBps
            ? deviation * BPS_DENOMINATOR / 1e18 - feeBps
            : 0;
    }

    // ── mutative ──

    /// @inheritdoc IPegArbExecutor
    function executeArb() external returns (uint256 profit) {
        (, ArbDirection dir) = _detectDirection();
        require(dir != ArbDirection.None, "no arb opportunity");

        uint256 vaultBal  = usdt.balanceOf(vault);
        uint256 tradeSize = vaultBal * maxArbBps / BPS_DENOMINATOR;
        require(tradeSize > 0, "zero trade");

        // pull USDT from vault (vault must have approved this contract)
        usdt.safeTransferFrom(vault, address(this), tradeSize);

        uint256 usdtBefore = usdt.balanceOf(address(this));

        if (dir == ArbDirection.BuyUSDF) {
            _executeBuyUSDF(tradeSize);
        } else {
            _executeSellUSDF(tradeSize);
        }

        uint256 usdtAfter = usdt.balanceOf(address(this));
        require(usdtAfter > usdtBefore, "no profit");
        profit = usdtAfter - usdtBefore;

        // enforce min profit
        require(
            profit * BPS_DENOMINATOR / tradeSize >= minProfitBps,
            "below min profit"
        );

        // pay bounty to caller
        uint256 bounty = profit * arbBountyBps / BPS_DENOMINATOR;
        if (bounty > 0) {
            usdt.safeTransfer(msg.sender, bounty);
        }

        // return everything else to vault
        uint256 remaining = usdt.balanceOf(address(this));
        if (remaining > 0) {
            usdt.safeTransfer(vault, remaining);
        }

        emit ArbExecuted(dir, tradeSize, profit, bounty, msg.sender);
    }

    // ── internals ──

    function _detectDirection()
        internal
        view
        returns (uint256 poolPrice, ArbDirection dir)
    {
        uint256[2] memory bal = stableSwapPool.get_balances();
        require(bal[1] > 0, "empty pool");
        poolPrice = bal[0] * 1e18 / bal[1]; // USDT per USDF

        uint256 threshold = 1e18 * deviationThresholdBps / BPS_DENOMINATOR;

        if (poolPrice < 1e18 - threshold) {
            dir = ArbDirection.BuyUSDF; // USDF cheap → buy on pool, redeem at par
        } else if (poolPrice > 1e18 + threshold) {
            dir = ArbDirection.SellUSDF; // USDF expensive → mint at par, sell on pool
        } else {
            dir = ArbDirection.None;
        }
    }

    /// @dev Path A: USDT → buy cheap USDF on pool → redeem USDF at par → USDT
    function _executeBuyUSDF(uint256 usdtAmount) internal {
        usdt.forceApprove(address(stableSwapPool), usdtAmount);
        // exchange: i=0 (USDT) → j=1 (USDF), min_dy=0 (profit check later)
        stableSwapPool.exchange(0, 1, usdtAmount, 0);
        usdt.forceApprove(address(stableSwapPool), 0);

        uint256 usdfBal = usdf.balanceOf(address(this));
        usdf.forceApprove(address(usdfMinting), usdfBal);
        usdfMinting.redeem(usdfBal);
        usdf.forceApprove(address(usdfMinting), 0);
    }

    /// @dev Path B: USDT → mint USDF at par → sell expensive USDF on pool → USDT
    function _executeSellUSDF(uint256 usdtAmount) internal {
        usdt.forceApprove(address(usdfMinting), usdtAmount);
        usdfMinting.mint(usdtAmount);
        usdt.forceApprove(address(usdfMinting), 0);

        uint256 usdfBal = usdf.balanceOf(address(this));
        usdf.forceApprove(address(stableSwapPool), usdfBal);
        // exchange: i=1 (USDF) → j=0 (USDT), min_dy=0 (profit check later)
        stableSwapPool.exchange(1, 0, usdfBal, 0);
        usdf.forceApprove(address(stableSwapPool), 0);
    }
}
