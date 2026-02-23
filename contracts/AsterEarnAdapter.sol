// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IAsterEarnAdapter} from "./interfaces/IAsterEarnAdapter.sol";

/// @title AsterEarnAdapter — async request / claim withdrawal pattern
/// @notice Wraps AsterDEX Earn minter with selector-based calls.
///         Supports async withdrawal request tracking with batch-claim support.
contract AsterEarnAdapter is Ownable2Step, IAsterEarnAdapter {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_CLAIM_BATCH = 50;

    // ── immutables ──
    IERC20  private immutable _asset;
    address public  immutable asterMinter;
    bytes4  public  immutable depositSelector;
    bytes4  public  immutable managedAssetsSelector;
    bytes4  public  immutable requestWithdrawSelector;
    bytes4  public  immutable claimWithdrawSelector;
    bytes4  public  immutable getWithdrawRequestSelector;

    // ── storage ──
    address public vault;
    bool    public configurationLocked;

    WithdrawRequest[] private _withdrawRequests;
    uint256 public totalPending;

    // ── events (adapter) ──
    event ExternalCallResult(bytes4 indexed selector, bool success, bytes data);

    // ── modifiers ──
    modifier onlyVault() {
        require(msg.sender == vault, "only vault");
        _;
    }

    constructor(
        address _assetAddr,
        address _asterMinter,
        bytes4  _depositSel,
        bytes4  _managedAssetsSel,
        bytes4  _requestWithdrawSel,
        bytes4  _claimWithdrawSel,
        bytes4  _getWithdrawRequestSel,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_assetAddr != address(0), "zero asset");
        require(_asterMinter != address(0), "zero minter");

        _asset                    = IERC20(_assetAddr);
        asterMinter               = _asterMinter;
        depositSelector           = _depositSel;
        managedAssetsSelector     = _managedAssetsSel;
        requestWithdrawSelector   = _requestWithdrawSel;
        claimWithdrawSelector     = _claimWithdrawSel;
        getWithdrawRequestSelector = _getWithdrawRequestSel;
    }

    // ── configuration (owner-only, one-shot) ──

    function setVault(address _vault) external onlyOwner {
        require(!configurationLocked, "locked");
        require(_vault != address(0), "zero vault");
        vault = _vault;
    }

    function lockConfiguration() external onlyOwner {
        require(vault != address(0), "vault not set");
        configurationLocked = true;
        renounceOwnership();
    }

    // ── IManagedAdapter ──

    function asset() external view returns (address) {
        return address(_asset);
    }

    function managedAssets() external view returns (uint256) {
        (bool ok, bytes memory data) = asterMinter.staticcall(
            abi.encodeWithSelector(managedAssetsSelector, address(this))
        );
        uint256 minterBalance = ok && data.length >= 32 ? abi.decode(data, (uint256)) : 0;
        return minterBalance + totalPending;
    }

    function onVaultDeposit(uint256 amount) external onlyVault {
        _asset.forceApprove(asterMinter, 0);
        _asset.forceApprove(asterMinter, amount);
        _callWithAmount(depositSelector, amount);
        _asset.forceApprove(asterMinter, 0);
    }

    function withdrawToVault(uint256 amount) external onlyVault returns (uint256) {
        // first, claim any matured requests to free liquid funds
        _claimAllMaturedInternal();

        uint256 available = _asset.balanceOf(address(this));
        uint256 actual = available < amount ? available : amount;
        if (actual > 0) {
            _asset.safeTransfer(vault, actual);
        }
        return actual;
    }

    // ── async withdraw (IAsterEarnAdapter) ──

    function requestWithdraw(uint256 amount) external onlyVault returns (uint256 requestId) {
        require(amount > 0, "zero amount");

        // call minter requestWithdraw
        (bool ok, bytes memory data) = asterMinter.call(
            abi.encodeWithSelector(requestWithdrawSelector, amount)
        );
        emit ExternalCallResult(requestWithdrawSelector, ok, data);
        require(ok && data.length >= 32, "request failed");
        requestId = abi.decode(data, (uint256));

        // query maturity from minter
        (bool ok2, bytes memory data2) = asterMinter.staticcall(
            abi.encodeWithSelector(getWithdrawRequestSelector, requestId)
        );
        require(ok2 && data2.length >= 96, "query failed");
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

    function claimAllMatured() external onlyVault returns (uint256 totalClaimed) {
        totalClaimed = _claimAllMaturedInternal();
        // C2 FIX: Forward claimed funds to vault immediately
        if (totalClaimed > 0) {
            uint256 balance = _asset.balanceOf(address(this));
            if (balance > 0) {
                _asset.safeTransfer(vault, balance);
            }
        }
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

    function _claimAtIndex(uint256 index) internal returns (uint256) {
        require(index < _withdrawRequests.length, "bad index");
        WithdrawRequest storage req = _withdrawRequests[index];
        require(!req.claimed, "already claimed");
        require(block.timestamp >= req.maturityTimestamp, "not matured");

        (bool ok, bytes memory data) = asterMinter.call(
            abi.encodeWithSelector(claimWithdrawSelector, req.requestId)
        );
        emit ExternalCallResult(claimWithdrawSelector, ok, data);
        require(ok, "claim failed");

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
        require(ok, "call failed");
        if (data.length >= 32) {
            bool result = abi.decode(data, (bool));
            require(result, "call returned false");
        }
    }
}
