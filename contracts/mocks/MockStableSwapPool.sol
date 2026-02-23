// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IStableSwapPool} from "../interfaces/IStableSwapPool.sol";

/// @title MockStableSwapPool — test double for PCS StableSwap
contract MockStableSwapPool is IStableSwapPool {
    uint256[2] public balances;
    uint256 public virtualPrice;
    uint256 public feeBps; // e.g. 4 = 0.04%

    IERC20 public token0; // USDT
    IERC20 public token1; // USDF

    constructor(
        address _token0,
        address _token1,
        uint256 _bal0,
        uint256 _bal1,
        uint256 _virtualPrice,
        uint256 _feeBps
    ) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        balances[0] = _bal0;
        balances[1] = _bal1;
        virtualPrice = _virtualPrice;
        feeBps = _feeBps;
    }

    function get_balances() external view returns (uint256[2] memory) {
        return balances;
    }

    function get_virtual_price() external view returns (uint256) {
        return virtualPrice;
    }

    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256 dy) {
        IERC20 tokenIn  = i == 0 ? token0 : token1;
        IERC20 tokenOut = i == 0 ? token1 : token0;

        tokenIn.transferFrom(msg.sender, address(this), dx);

        // simple constant-product with fee
        dy = dx * (10_000 - feeBps) / 10_000;
        // apply pool imbalance: if selling token that pool has less of, get more
        uint256 idxIn  = uint256(uint128(i));
        uint256 idxOut = uint256(uint128(j));
        if (balances[idxOut] > 0 && balances[idxIn] > 0) {
            dy = dx * balances[idxOut] / balances[idxIn];
            dy = dy * (10_000 - feeBps) / 10_000;
        }

        require(dy >= min_dy, "slippage");
        tokenOut.transfer(msg.sender, dy);

        balances[idxIn]  += dx;
        balances[idxOut] -= dy;
    }

    /// @notice Stub — not used by existing tests; satisfies IStableSwapPool.
    function add_liquidity(uint256[2] calldata /*amounts*/, uint256 /*min_mint_amount*/) external pure returns (uint256) {
        revert("use MockStableSwapPoolWithLPSupport");
    }

    /// @notice Stub — not used by existing tests; satisfies IStableSwapPool.
    function remove_liquidity_one_coin(uint256 /*token_amount*/, int128 /*i*/, uint256 /*min_amount*/) external pure returns (uint256) {
        revert("use MockStableSwapPoolWithLPSupport");
    }

    // ── test helpers ──
    function setBalances(uint256 b0, uint256 b1) external {
        balances[0] = b0;
        balances[1] = b1;
    }

    function setVirtualPrice(uint256 vp) external {
        virtualPrice = vp;
    }
}
