// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IManagedAdapter} from "./interfaces/IManagedAdapter.sol";

interface IVToken {
    function mint(uint256 mintAmount) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function decimals() external view returns (uint8);
}

/// @title VenusYieldAdapter — Yield-bearing buffer integrating Venus Protocol (vUSDT)
/// @custom:security-contact security@asterpilot.xyz
contract VenusYieldAdapter is Ownable2Step, IManagedAdapter {
    using SafeERC20 for IERC20;

    error VenusAdapter__ZeroAddress();
    error VenusAdapter__OnlyVault();
    error VenusAdapter__ConfigurationLocked();
    error VenusAdapter__VaultNotSet();
    error VenusAdapter__ZeroAmount();
    error VenusAdapter__MintFailed(uint256 errorCode);
    error VenusAdapter__RedeemFailed(uint256 errorCode);
    error VenusAdapter__VenusDecimalsInvalid();

    IERC20 private immutable _asset;
    IVToken private immutable _vToken;
    uint256 public immutable exchangeRateScale;
    address public vault;
    bool public configurationLocked;

    event VaultUpdated(address indexed vaultAddress);
    event VaultDepositRecorded(uint256 amount);
    event VaultWithdrawal(uint256 requestedAmount, uint256 sentAmount);
    event ConfigurationLocked();

    modifier onlyVault() {
        if (msg.sender != vault) revert VenusAdapter__OnlyVault();
        _;
    }

    constructor(address asset_, address vToken_, address initialOwner) Ownable(initialOwner) {
        if (asset_ == address(0) || vToken_ == address(0)) revert VenusAdapter__ZeroAddress();
        _asset = IERC20(asset_);
        _vToken = IVToken(vToken_);

        uint8 assetDecimals = IERC20Metadata(asset_).decimals();
        uint8 vTokenDecimals = _vToken.decimals();
        uint256 exponent = 18 + uint256(assetDecimals);

        if (exponent < vTokenDecimals || exponent - vTokenDecimals > 77) {
            revert VenusAdapter__VenusDecimalsInvalid();
        }

        exchangeRateScale = 10 ** (exponent - vTokenDecimals);
    }

    function setVault(address vault_) external onlyOwner {
        if (configurationLocked) revert VenusAdapter__ConfigurationLocked();
        if (vault_ == address(0)) revert VenusAdapter__ZeroAddress();
        vault = vault_;
        emit VaultUpdated(vault_);
    }

    function lockConfiguration() external onlyOwner {
        if (configurationLocked) revert VenusAdapter__ConfigurationLocked();
        if (vault == address(0)) revert VenusAdapter__VaultNotSet();
        configurationLocked = true;
        _asset.forceApprove(address(_vToken), type(uint256).max);
        emit ConfigurationLocked();
        renounceOwnership();
    }

    function managedAssets() external view returns (uint256) {
        uint256 vTokenBalance = _vToken.balanceOf(address(this));
        uint256 exchangeRate = _vToken.exchangeRateStored();
        // exchangeRate is scaled by 10^(18 + underlyingDecimals - vTokenDecimals)
        uint256 underlyingBalance = (vTokenBalance * exchangeRate) / exchangeRateScale;
        return underlyingBalance + _asset.balanceOf(address(this));
    }

    function asset() external view returns (address) {
        return address(_asset);
    }

    function onVaultDeposit(uint256 amount) external onlyVault {
        if (amount == 0) revert VenusAdapter__ZeroAmount();
        
        uint256 err = _vToken.mint(amount);
        if (err != 0) revert VenusAdapter__MintFailed(err);

        emit VaultDepositRecorded(amount);
    }

    function withdrawToVault(uint256 amount) external onlyVault returns (uint256 toSend) {
        if (amount == 0) return 0;

        uint256 currentBalance = _asset.balanceOf(address(this));
        
        // If we don't have enough idle asset, redeem from Venus
        if (currentBalance < amount) {
            uint256 toRedeem = amount - currentBalance;
            // Best effort redeem, may fail if Venus lacks liquidity
            uint256 err = _vToken.redeemUnderlying(toRedeem);
            if (err != 0) revert VenusAdapter__RedeemFailed(err);
        }

        uint256 available = _asset.balanceOf(address(this));
        toSend = amount > available ? available : amount;
        
        if (toSend > 0) {
            _asset.safeTransfer(vault, toSend);
            emit VaultWithdrawal(amount, toSend);
        }
    }
}
