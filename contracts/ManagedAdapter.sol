// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IManagedAdapter} from "./interfaces/IManagedAdapter.sol";

contract ManagedAdapter is Ownable, IManagedAdapter {
    using SafeERC20 for IERC20;

    IERC20 private immutable _asset;
    address public vault;
    bool public configurationLocked;

    event VaultUpdated(address indexed vaultAddress);
    event VaultDepositRecorded(uint256 amount);
    event VaultWithdrawal(uint256 requestedAmount, uint256 sentAmount);
    event ConfigurationLocked();

    constructor(address asset_, address initialOwner) Ownable(initialOwner) {
        require(asset_ != address(0), "asset is zero");
        _asset = IERC20(asset_);
    }

    modifier onlyVault() {
        require(msg.sender == vault, "only vault");
        _;
    }

    function setVault(address vault_) external onlyOwner {
        require(!configurationLocked, "configuration locked");
        require(vault_ != address(0), "vault is zero");
        vault = vault_;
        emit VaultUpdated(vault_);
    }

    function lockConfiguration() external onlyOwner {
        require(!configurationLocked, "configuration locked");
        require(vault != address(0), "vault not set");
        configurationLocked = true;
        emit ConfigurationLocked();
        renounceOwnership();
    }

    function managedAssets() external view returns (uint256) {
        return _asset.balanceOf(address(this));
    }

    function asset() external view returns (address) {
        return address(_asset);
    }

    function onVaultDeposit(uint256 amount) external onlyVault {
        require(amount > 0, "amount is zero");
        emit VaultDepositRecorded(amount);
    }

    function withdrawToVault(uint256 amount) external onlyVault returns (uint256) {
        uint256 available = _asset.balanceOf(address(this));
        uint256 toSend = amount > available ? available : amount;
        if (toSend == 0) {
            return 0;
        }

        _asset.safeTransfer(vault, toSend);
        emit VaultWithdrawal(amount, toSend);
        return toSend;
    }
}
