// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IAsterEarnAdapter} from "./interfaces/IAsterEarnAdapter.sol";
import {IPancakeRouter} from "./interfaces/IPancakeRouter.sol";

/// @title AsterEarnAdapterWithSwap — async request / claim withdrawal pattern + USDT→USDF swap
/// @notice Wraps AsterDEX Earn minter with selector-based calls.
///         Supports async withdrawal request tracking with batch-claim support.
///         Swaps USDT → USDF before depositing into AsterDEX Earn (robot route compliance)
contract AsterEarnAdapterWithSwap is Ownable2Step, IAsterEarnAdapter {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_CLAIM_BATCH = 50;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // ── immutables ──
    IERC20  private immutable _inputAsset;  // USDT (what vault sends)
    IERC20  private immutable _outputAsset; // USDF (what Aster Earn accepts)
    address public  immutable asterMinter;
    bytes4  public  immutable depositSelector;
    bytes4  public  immutable managedAssetsSelector;
    bytes4  public  immutable requestWithdrawSelector;
    bytes4  public  immutable claimWithdrawSelector;
    bytes4  public  immutable getWithdrawRequestSelector;
    
    IPancakeRouter public immutable router; // PancakeSwap router for USDT→USDF swap

    // ── storage ──
    address public vault;
    bool    public configurationLocked;
    uint256 public swapSlippageBps; // Max slippage for USDT→USDF swap (configurable before lock)

    WithdrawRequest[] private _withdrawRequests;
    uint256 public totalPending;

    // ── events (adapter) ──
    event ExternalCallResult(bytes4 indexed selector, bool success, bytes data);
    event SwapExecuted(uint256 usdtIn, uint256 usdfOut);
    event SwapSettingsUpdated(uint256 slippageBps);

    // ── errors ──
    error AsterEarnAdapterWithSwap__CallerNotVault();
    error AsterEarnAdapterWithSwap__ConfigurationLocked();
    error AsterEarnAdapterWithSwap__ZeroAddress();
    error AsterEarnAdapterWithSwap__VaultNotSet();
    error AsterEarnAdapterWithSwap__ZeroAmount();
    error AsterEarnAdapterWithSwap__SlippageTooHigh();
    error AsterEarnAdapterWithSwap__InvalidIndex();
    error AsterEarnAdapterWithSwap__AlreadyClaimed();
    error AsterEarnAdapterWithSwap__NotMatured();
    error AsterEarnAdapterWithSwap__RequestFailed();
    error AsterEarnAdapterWithSwap__QueryFailed();
    error AsterEarnAdapterWithSwap__ClaimFailed();
    error AsterEarnAdapterWithSwap__CallFailed();
    error AsterEarnAdapterWithSwap__CallReturnedFalse();

    // ── modifiers ──
    modifier onlyVault() {
        if (msg.sender != vault) revert AsterEarnAdapterWithSwap__CallerNotVault();
        _;
    }

    constructor(
        address _inputAssetAddr,  // USDT
        address _outputAssetAddr, // USDF
        address _asterMinter,
        bytes4  _depositSel,
        bytes4  _managedAssetsSel,
        bytes4  _requestWithdrawSel,
        bytes4  _claimWithdrawSel,
        bytes4  _getWithdrawRequestSel,
        address _router,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_inputAssetAddr == address(0)) revert AsterEarnAdapterWithSwap__ZeroAddress();
        if (_outputAssetAddr == address(0)) revert AsterEarnAdapterWithSwap__ZeroAddress();
        if (_asterMinter == address(0)) revert AsterEarnAdapterWithSwap__ZeroAddress();
        if (_router == address(0)) revert AsterEarnAdapterWithSwap__ZeroAddress();

        _inputAsset               = IERC20(_inputAssetAddr);
        _outputAsset              = IERC20(_outputAssetAddr);
        asterMinter               = _asterMinter;
        depositSelector           = _depositSel;
        managedAssetsSelector     = _managedAssetsSel;
        requestWithdrawSelector   = _requestWithdrawSel;
        claimWithdrawSelector     = _claimWithdrawSel;
        getWithdrawRequestSelector = _getWithdrawRequestSel;
        router                    = IPancakeRouter(_router);

        // Default: 1% max slippage for USDT→USDF swap
        swapSlippageBps = 100;
    }

    // ── configuration (owner-only, one-shot) ──

    function setVault(address _vault) external onlyOwner {
        if (configurationLocked) revert AsterEarnAdapterWithSwap__ConfigurationLocked();
        if (_vault == address(0)) revert AsterEarnAdapterWithSwap__ZeroAddress();
        vault = _vault;
    }

    function setSwapSlippage(uint256 slippageBps_) external onlyOwner {
        if (configurationLocked) revert AsterEarnAdapterWithSwap__ConfigurationLocked();
        if (slippageBps_ > 1000) revert AsterEarnAdapterWithSwap__SlippageTooHigh();
        swapSlippageBps = slippageBps_;
        emit SwapSettingsUpdated(slippageBps_);
    }

    function lockConfiguration() external onlyOwner {
        if (vault == address(0)) revert AsterEarnAdapterWithSwap__VaultNotSet();
        configurationLocked = true;
        renounceOwnership();
    }

    // ── IManagedAdapter ──

    function asset() external view returns (address) {
        return address(_inputAsset); // Vault sends USDT
    }

    function managedAssets() external view returns (uint256) {
        (bool ok, bytes memory data) = asterMinter.staticcall(
            abi.encodeWithSelector(managedAssetsSelector, address(this))
        );
        uint256 minterBalance = ok && data.length >= 32 ? abi.decode(data, (uint256)) : 0;
        return minterBalance + totalPending;
    }

    /// @notice Called by vault after transferring USDT to this adapter
    /// @dev ROBOT ROUTE: USDT → USDF (swap) → AsterDEX Earn deposit
    function onVaultDeposit(uint256 amount) external onlyVault {
        // 1. Swap USDT → USDF on PancakeSwap
        uint256 usdfReceived = _swapUsdtToUsdf(amount);
        
        // 2. Deposit USDF into AsterDEX Earn
        _outputAsset.forceApprove(asterMinter, 0);
        _outputAsset.forceApprove(asterMinter, usdfReceived);
        _callWithAmount(depositSelector, usdfReceived);
        _outputAsset.forceApprove(asterMinter, 0);
    }

    function withdrawToVault(uint256 amount) external onlyVault returns (uint256) {
        // first, claim any matured requests to free liquid funds
        _claimAllMaturedInternal();

        uint256 available = _inputAsset.balanceOf(address(this));
        uint256 actual = available < amount ? available : amount;
        if (actual > 0) {
            _inputAsset.safeTransfer(vault, actual);
        }
        return actual;
    }

    // ── async withdraw (IAsterEarnAdapter) ──

    function requestWithdraw(uint256 amount) external onlyVault returns (uint256 requestId) {
        if (amount == 0) revert AsterEarnAdapterWithSwap__ZeroAmount();

        // call minter requestWithdraw
        (bool ok, bytes memory data) = asterMinter.call(
            abi.encodeWithSelector(requestWithdrawSelector, amount)
        );
        emit ExternalCallResult(requestWithdrawSelector, ok, data);
        if (!ok || data.length < 32) revert AsterEarnAdapterWithSwap__RequestFailed();
        requestId = abi.decode(data, (uint256));

        // query maturity from minter
        (bool ok2, bytes memory data2) = asterMinter.staticcall(
            abi.encodeWithSelector(getWithdrawRequestSelector, requestId)
        );
        if (!ok2 || data2.length < 96) revert AsterEarnAdapterWithSwap__QueryFailed();
        (uint256 amt, uint256 maturity, ) = abi.decode(data2, (uint256, uint256, bool));

        _withdrawRequests.push(WithdrawRequest({
            requestId: requestId,
            amount: amt,
            maturityTimestamp: maturity,
            claimed: false
        }));
        totalPending += amt;

        emit WithdrawRequested(requestId, amt, maturity);
    }

    function claimWithdraw(uint256 index) external onlyVault returns (uint256) {
        return _claimAtIndex(index);
    }

    function claimAllMatured() external returns (uint256 totalClaimed) {
        return _claimAllMaturedInternal();
    }

    function pendingWithdrawals() external view returns (WithdrawRequest[] memory) {
        uint256 count;
        for (uint256 i; i < _withdrawRequests.length; i++) {
            if (!_withdrawRequests[i].claimed) count++;
        }
        WithdrawRequest[] memory result = new WithdrawRequest[](count);
        uint256 j;
        for (uint256 i; i < _withdrawRequests.length; i++) {
            if (!_withdrawRequests[i].claimed) {
                result[j++] = _withdrawRequests[i];
            }
        }
        return result;
    }

    function maturedWithdrawals() external view returns (uint256 count, uint256 totalAmount) {
        for (uint256 i; i < _withdrawRequests.length; i++) {
            WithdrawRequest storage req = _withdrawRequests[i];
            if (!req.claimed && block.timestamp >= req.maturityTimestamp) {
                count++;
                totalAmount += req.amount;
            }
        }
    }

    // ── internals ──

    /// @dev Swap USDT → USDF via PancakeSwap router
    function _swapUsdtToUsdf(uint256 usdtAmount) internal returns (uint256 usdfReceived) {
        if (usdtAmount == 0) revert AsterEarnAdapterWithSwap__ZeroAmount();

        // Build swap path: USDT → USDF
        address[] memory path = new address[](2);
        path[0] = address(_inputAsset);  // USDT
        path[1] = address(_outputAsset); // USDF

        // Get expected output
        uint256[] memory amountsOut = router.getAmountsOut(usdtAmount, path);
        uint256 minUsdfOut = amountsOut[1] * (BPS_DENOMINATOR - swapSlippageBps) / BPS_DENOMINATOR;

        // Execute swap
        _inputAsset.forceApprove(address(router), usdtAmount);
        uint256[] memory amounts = router.swapExactTokensForTokens(
            usdtAmount,
            minUsdfOut,
            path,
            address(this),
            block.timestamp + 300 // 5 min deadline
        );

        usdfReceived = amounts[1];
        emit SwapExecuted(usdtAmount, usdfReceived);
        return usdfReceived;
    }

    function _claimAtIndex(uint256 index) internal returns (uint256) {
        if (index >= _withdrawRequests.length) revert AsterEarnAdapterWithSwap__InvalidIndex();
        WithdrawRequest storage req = _withdrawRequests[index];
        if (req.claimed) revert AsterEarnAdapterWithSwap__AlreadyClaimed();
        if (block.timestamp < req.maturityTimestamp) revert AsterEarnAdapterWithSwap__NotMatured();

        (bool ok, bytes memory data) = asterMinter.call(
            abi.encodeWithSelector(claimWithdrawSelector, req.requestId)
        );
        emit ExternalCallResult(claimWithdrawSelector, ok, data);
        if (!ok) revert AsterEarnAdapterWithSwap__ClaimFailed();

        req.claimed = true;
        totalPending -= req.amount;
        emit WithdrawClaimed(req.requestId, req.amount);
        return req.amount;
    }

    function _claimAllMaturedInternal() internal returns (uint256 totalClaimed) {
        uint256 len = _withdrawRequests.length;
        uint256 claimed;
        for (uint256 i; i < len && claimed < MAX_CLAIM_BATCH; i++) {
            WithdrawRequest storage req = _withdrawRequests[i];
            if (!req.claimed && block.timestamp >= req.maturityTimestamp) {
                (bool ok, ) = asterMinter.call(
                    abi.encodeWithSelector(claimWithdrawSelector, req.requestId)
                );
                if (ok) {
                    req.claimed = true;
                    totalPending -= req.amount;
                    totalClaimed += req.amount;
                    emit WithdrawClaimed(req.requestId, req.amount);
                    claimed++;
                }
            }
        }
    }

    function _callWithAmount(bytes4 selector, uint256 amount) internal {
        (bool ok, bytes memory data) = asterMinter.call(
            abi.encodeWithSelector(selector, amount)
        );
        emit ExternalCallResult(selector, ok, data);
        if (!ok) revert AsterEarnAdapterWithSwap__CallFailed();
        if (data.length >= 32) {
            bool result = abi.decode(data, (bool));
            if (!result) revert AsterEarnAdapterWithSwap__CallReturnedFalse();
        }
    }
}
