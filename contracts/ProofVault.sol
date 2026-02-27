// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    ERC4626
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IManagedAdapter} from "./interfaces/IManagedAdapter.sol";
import {IAsterEarnAdapter} from "./interfaces/IAsterEarnAdapter.sol";
import {IVenusVToken} from "./interfaces/IVenusVToken.sol";

/// @title ProofVault — ERC-4626 vault with idle buffer + 3-tier withdrawal + async Aster tracking
/// @notice Supports 3 yield rails: Aster (async), secondary (ManagedAdapter), LP (StableSwap)
/// @custom:security-contact security@asterpilot.xyz
contract ProofVault is ERC4626, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;

    // --- Immutables ---
    uint256 public immutable idleBufferBps;

    // --- Wired references (set once, then locked) ---
    address public engine;
    IAsterEarnAdapter public asterAdapter;
    IManagedAdapter public secondaryAdapter;
    IManagedAdapter public lpAdapter;
    IVenusVToken public venusVToken;
    uint256 public venusExchangeRateScale;
    bool public configurationLocked;
    mapping(address => uint256) private _lastDepositBlock;
    address public pegArbExecutor;

    // --- Events ---
    event Rebalanced(
        uint256 asterTarget,
        uint256 actualAster,
        uint256 idle,
        uint256 secondary,
        uint256 lp
    );
    event BountyPaid(address indexed executor, uint256 amount);
    event AutoHarvestTriggered(uint256 harvested);
    event AsterWithdrawRequestFailed(uint256 amount);
    event EngineSet(address indexed engine);
    event PegArbExecutorSet(address indexed pegArbExecutor);
    event VenusIdleBufferSet(address indexed venusVToken, uint256 exchangeRateScale);
    event AdaptersSet(
        address indexed aster,
        address indexed secondary,
        address indexed lp
    );

    // --- Errors ---
    error ProofVault__CallerNotEngine();
    error ProofVault__ConfigurationLocked();
    error ProofVault__ZeroAddress();
    error ProofVault__BufferTooHigh();
    error ProofVault__NotLocked();
    error ProofVault__EngineNotSet();
    error ProofVault__AsterNotSet();
    error ProofVault__SecondaryNotSet();
    error ProofVault__LpNotSet();
    error ProofVault__InsufficientLiquidity();
    error ProofVault__PegArbNotApproved();
    error ProofVault__SlippageExceeded(uint256 expected, uint256 actual, uint256 maxSlippageBps);
    error ProofVault__FlashLoanBlocked();
    error ProofVault__InvalidFlashAdapter();
    error ProofVault__InvalidFlashRoute();
    error ProofVault__FlashPrincipalMissing();
    error ProofVault__FlashRepayShortfall(uint256 required, uint256 available);
    error ProofVault__VenusDecimalsInvalid();
    error ProofVault__VenusMintFailed(uint256 code);
    error ProofVault__VenusRedeemFailed(uint256 code);

    // --- Modifiers ---
    modifier onlyEngine() {
        if (msg.sender != engine) revert ProofVault__CallerNotEngine();
        _;
    }

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address initialOwner_,
        uint256 idleBufferBps_
    ) ERC20(name_, symbol_) ERC4626(asset_) Ownable(initialOwner_) {
        if (idleBufferBps_ > 2000) revert ProofVault__BufferTooHigh();
        idleBufferBps = idleBufferBps_;
    }

    /*//////////////////////////////////////////////////////////////
                         CONFIGURATION (ONE-TIME WIRING)
    //////////////////////////////////////////////////////////////*/

    function setEngine(address engine_) external onlyOwner {
        if (configurationLocked) revert ProofVault__ConfigurationLocked();
        if (engine_ == address(0)) revert ProofVault__ZeroAddress();
        engine = engine_;
        emit EngineSet(engine_);
    }

    function setAdapters(
        IAsterEarnAdapter aster_,
        IManagedAdapter secondary_,
        IManagedAdapter lp_
    ) external onlyOwner {
        if (configurationLocked) revert ProofVault__ConfigurationLocked();
        asterAdapter = aster_;
        secondaryAdapter = secondary_;
        lpAdapter = lp_;
        emit AdaptersSet(address(aster_), address(secondary_), address(lp_));
    }

    function setPegArbExecutor(address pegArb_) external onlyOwner {
        if (configurationLocked) revert ProofVault__ConfigurationLocked();
        if (pegArb_ == address(0)) revert ProofVault__ZeroAddress();
        pegArbExecutor = pegArb_;
        emit PegArbExecutorSet(pegArb_);
    }

    function setVenusIdleBuffer(address venusVToken_) external onlyOwner {
        if (configurationLocked) revert ProofVault__ConfigurationLocked();

        if (venusVToken_ == address(0)) {
            venusVToken = IVenusVToken(address(0));
            venusExchangeRateScale = 0;
            emit VenusIdleBufferSet(address(0), 0);
            return;
        }

        IVenusVToken candidate = IVenusVToken(venusVToken_);
        uint8 assetDecimals = IERC20Metadata(asset()).decimals();
        uint8 vTokenDecimals = candidate.decimals();
        uint256 exponent = 18 + uint256(assetDecimals);

        if (exponent < vTokenDecimals || exponent - vTokenDecimals > 77) {
            revert ProofVault__VenusDecimalsInvalid();
        }

        uint256 scale = 10 ** (exponent - vTokenDecimals);

        venusVToken = candidate;
        venusExchangeRateScale = scale;
        IERC20(asset()).forceApprove(venusVToken_, type(uint256).max);

        emit VenusIdleBufferSet(venusVToken_, scale);
    }

    function lockConfiguration() external onlyOwner {
        if (engine == address(0)) revert ProofVault__EngineNotSet();
        if (address(asterAdapter) == address(0))
            revert ProofVault__AsterNotSet();
        if (address(secondaryAdapter) == address(0))
            revert ProofVault__SecondaryNotSet();
        // lpAdapter is optional: some deployments use only 2 yield rails
        configurationLocked = true;

        // Approve PegArbExecutor to pull USDT for arb trades (optional)
        if (pegArbExecutor != address(0)) {
            IERC20(asset()).forceApprove(pegArbExecutor, type(uint256).max);
        }

        renounceOwnership();
    }

    /*//////////////////////////////////////////////////////////////
                           ERC-4626 OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /// @notice Total assets = idle balance + aster managed + secondary managed + lp managed
    /// @dev Each adapter call is try/catch-guarded: a reverting adapter returns 0 rather than
    ///      propagating the revert and bricking deposits/withdrawals/share-price calculations.
    function totalAssets() public view override returns (uint256) {
        uint256 asterManaged;
        try asterAdapter.managedAssets() returns (uint256 v) { asterManaged = v; } catch {}

        uint256 secondaryManaged;
        try secondaryAdapter.managedAssets() returns (uint256 v) { secondaryManaged = v; } catch {}

        uint256 lpManaged;
        if (address(lpAdapter) != address(0)) {
            try lpAdapter.managedAssets() returns (uint256 v) { lpManaged = v; } catch {}
        }

        return _idleAssets() + asterManaged + secondaryManaged + lpManaged;
    }

    function deposit(
        uint256 assets,
        address receiver
    ) public override nonReentrant returns (uint256) {
        if (!configurationLocked) revert ProofVault__NotLocked();
        _lastDepositBlock[receiver] = block.number;
        _maybeHarvest();
        uint256 shares = super.deposit(assets, receiver);
        _parkIdleInVenus(_bufferTarget(totalAssets()));
        return shares;
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override nonReentrant returns (uint256) {
        if (!configurationLocked) revert ProofVault__NotLocked();
        _lastDepositBlock[receiver] = block.number;
        _maybeHarvest();
        uint256 mintedShares = super.mint(shares, receiver);
        _parkIdleInVenus(_bufferTarget(totalAssets()));
        return mintedShares;
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner_
    ) public override nonReentrant returns (uint256) {
        if (_lastDepositBlock[owner_] == block.number) revert ProofVault__FlashLoanBlocked();
        _ensureLiquid(assets);
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) public override nonReentrant returns (uint256) {
        if (_lastDepositBlock[owner_] == block.number) revert ProofVault__FlashLoanBlocked();
        uint256 assets = previewRedeem(shares);
        _ensureLiquid(assets);
        return super.redeem(shares, receiver, owner_);
    }

    /// @dev Offset decimals by 6 for donation attack protection
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    /*//////////////////////////////////////////////////////////////
                     REBALANCE (CALLED BY STRATEGY ENGINE)
    //////////////////////////////////////////////////////////////*/

    /// @notice Rebalance assets between idle buffer, aster, secondary, and LP
    function rebalance(
        uint256 asterTargetBps,
        uint256 maxSlippageBps,
        address executor,
        uint256 bountyBps,
        uint256 lpTargetBps
    ) external nonReentrant onlyEngine {
        if (!configurationLocked) revert ProofVault__NotLocked();
        uint256 total = totalAssets();
        uint256 buffer = _bufferTarget(total);
        uint256 deployable = total > buffer ? total - buffer : 0;

        // Pull secondary to idle first so funds can be reallocated across rails
        {
            uint256 secManaged = secondaryAdapter.managedAssets();
            if (secManaged > 0) {
                secondaryAdapter.withdrawToVault(secManaged);
            }
        }

        // Aster rail
        uint256 asterTarget = (deployable * asterTargetBps) / BPS_DENOMINATOR;
        uint256 currentAster = asterAdapter.managedAssets();

        if (asterTarget > currentAster) {
            uint256 deficit = asterTarget - currentAster;
            uint256 available = _availableIdleForDeployment(buffer);
            if (available > 0) {
                uint256 toSend = Math.min(deficit, available);
                _ensureRawLiquidity(toSend, buffer);
                toSend = Math.min(toSend, IERC20(asset()).balanceOf(address(this)));
                IERC20(asset()).safeTransfer(address(asterAdapter), toSend);
                asterAdapter.onVaultDeposit(toSend);
            }
        } else if (currentAster > asterTarget) {
            uint256 requestAmount = currentAster - asterTarget;
            try asterAdapter.requestWithdraw(requestAmount) {
            } catch {
                emit AsterWithdrawRequestFailed(requestAmount);
            }
        }

        // LP rail
        _rebalanceLp(deployable, lpTargetBps, buffer);

        // Pay executor bounty (before secondary absorbs excess)
        _payExecutorBounty(executor, bountyBps, total);

        // Secondary rail: absorb remaining idle excess
        _rebalanceSecondary(buffer);
        _parkIdleInVenus(buffer);


        // Slippage check: verify totalAssets didn't drop beyond acceptable threshold
        {
            uint256 postTotal = totalAssets();
            uint256 minAcceptable = (total * (BPS_DENOMINATOR - maxSlippageBps)) / BPS_DENOMINATOR;
            if (postTotal < minAcceptable) {
                revert ProofVault__SlippageExceeded(total, postTotal, maxSlippageBps);
            }
        }

        uint256 idle = _idleAssets();
        uint256 lpManaged = address(lpAdapter) != address(0)
            ? lpAdapter.managedAssets()
            : 0;
        emit Rebalanced(
            asterTarget,
            asterAdapter.managedAssets(),
            idle,
            secondaryAdapter.managedAssets(),
            lpManaged
        );
    }

    /// @notice Atomic flash-loan rebalance step: deploy borrowed funds, pull source adapter liquidity, and repay pool.
    /// @dev Called by StrategyEngine from Pancake/Uniswap V3 flash callback.
    function executeFlashRebalanceStep(
        address fromAdapter,
        address toAdapter,
        uint256 flashPrincipal,
        uint256 repayAmount,
        address flashPool
    ) external nonReentrant onlyEngine {
        if (!_isConfiguredAdapter(fromAdapter) || !_isConfiguredAdapter(toAdapter)) {
            revert ProofVault__InvalidFlashAdapter();
        }
        if (fromAdapter == toAdapter || flashPool == address(0)) {
            revert ProofVault__InvalidFlashRoute();
        }
        if (flashPrincipal == 0 || repayAmount < flashPrincipal) {
            revert ProofVault__FlashPrincipalMissing();
        }

        IERC20 assetToken = IERC20(asset());
        if (assetToken.balanceOf(address(this)) < flashPrincipal) {
            revert ProofVault__FlashPrincipalMissing();
        }

        assetToken.safeTransfer(toAdapter, flashPrincipal);
        IManagedAdapter(toAdapter).onVaultDeposit(flashPrincipal);

        IManagedAdapter(fromAdapter).withdrawToVault(repayAmount);

        uint256 available = assetToken.balanceOf(address(this));
        if (available < repayAmount) {
            revert ProofVault__FlashRepayShortfall(repayAmount, available);
        }
        assetToken.safeTransfer(flashPool, repayAmount);
    }

    /*//////////////////////////////////////////////////////////////
                                  VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns buffer status: target amount, current idle, utilization in bps
    function bufferStatus()
        external
        view
        returns (uint256 target, uint256 current, uint256 utilizationBps)
    {
        uint256 total = totalAssets();
        target = _bufferTarget(total);
        current = _idleAssets();
        utilizationBps = target > 0
            ? Math.min((current * BPS_DENOMINATOR) / target, BPS_DENOMINATOR)
            : BPS_DENOMINATOR;
    }

    /// @notice Returns total pending async Aster withdrawals
    function pendingAsterWithdrawals()
        external
        view
        returns (uint256 count, uint256 totalAmount)
    {
        return asterAdapter.maturedWithdrawals();
    }

    /*//////////////////////////////////////////////////////////////
                              INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Buffer target = totalAssets * idleBufferBps / BPS_DENOMINATOR
    function _bufferTarget(uint256 total) internal view returns (uint256) {
        return (total * idleBufferBps) / BPS_DENOMINATOR;
    }

    /// @dev 4-tier liquidity: idle → secondary → LP → matured Aster claims
    function _ensureLiquid(uint256 needed) internal {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle >= needed) return;

        if (address(venusVToken) != address(0)) {
            uint256 remainingFromVenus = needed - idle;
            uint256 venusIdle = _venusUnderlyingBalance();
            if (venusIdle > 0) {
                _redeemFromVenus(Math.min(remainingFromVenus, venusIdle));
                idle = IERC20(asset()).balanceOf(address(this));
                if (idle >= needed) return;
            }
        }

        // Tier 2: Pull from secondary adapter
        uint256 remaining = needed - idle;
        uint256 secondaryAvail = secondaryAdapter.managedAssets();
        if (secondaryAvail > 0) {
            uint256 toPull = Math.min(remaining, secondaryAvail);
            secondaryAdapter.withdrawToVault(toPull);
            idle = IERC20(asset()).balanceOf(address(this));
            if (idle >= needed) return;
        }

        // Tier 2.5: Pull from LP adapter — pull only what's needed, not full balance
        if (address(lpAdapter) != address(0)) {
            uint256 lpAvail = lpAdapter.managedAssets();
            if (lpAvail > 0) {
                uint256 still = needed - IERC20(asset()).balanceOf(address(this));
                uint256 lpPull = still < lpAvail ? still : lpAvail;
                lpAdapter.withdrawToVault(lpPull);
                idle = IERC20(asset()).balanceOf(address(this));
                if (idle >= needed) return;
                // Slippage shortfall — pull remaining LP if available
                uint256 lpRemaining = lpAdapter.managedAssets();
                if (lpRemaining > 0) {
                    lpAdapter.withdrawToVault(lpRemaining);
                    idle = IERC20(asset()).balanceOf(address(this));
                    if (idle >= needed) return;
                }
            }
        }

        // Tier 3: Claim matured Aster requests
        uint256 claimed = asterAdapter.claimAllMatured();
        if (claimed > 0) {
            idle = IERC20(asset()).balanceOf(address(this));
            if (idle >= needed) return;
        }

        if (IERC20(asset()).balanceOf(address(this)) < needed)
            revert ProofVault__InsufficientLiquidity();
    }

    /// @dev Rebalance LP adapter toward target allocation
    function _rebalanceLp(
        uint256 deployable,
        uint256 lpTargetBps,
        uint256 bufferTarget_
    ) internal {
        if (address(lpAdapter) == address(0) || lpTargetBps == 0) return;
        uint256 lpTarget = (deployable * lpTargetBps) / BPS_DENOMINATOR;
        uint256 currentLp = lpAdapter.managedAssets();

        if (lpTarget > currentLp) {
            uint256 deficit = lpTarget - currentLp;
            uint256 idle = _availableIdleForDeployment(bufferTarget_);
            if (idle > 0) {
                uint256 toSend = Math.min(deficit, idle);
                _ensureRawLiquidity(toSend, bufferTarget_);
                toSend = Math.min(toSend, IERC20(asset()).balanceOf(address(this)));
                IERC20(asset()).safeTransfer(address(lpAdapter), toSend);
                lpAdapter.onVaultDeposit(toSend);
            }
        } else if (currentLp > lpTarget) {
            lpAdapter.withdrawToVault(currentLp - lpTarget);
        }
    }

    /// @dev Move excess idle into secondary, or pull from secondary if below buffer
    function _rebalanceSecondary(uint256 bufferTarget_) internal {
        uint256 idle = _idleAssets();
        if (idle > bufferTarget_) {
            uint256 excess = idle - bufferTarget_;
            _ensureRawLiquidity(excess, bufferTarget_);
            uint256 toSend = Math.min(excess, IERC20(asset()).balanceOf(address(this)));
            if (toSend > 0) {
                IERC20(asset()).safeTransfer(address(secondaryAdapter), toSend);
                secondaryAdapter.onVaultDeposit(toSend);
            }
        }
    }

    /// @dev Pay executor bounty from vault's idle assets
    function _payExecutorBounty(
        address executor,
        uint256 bountyBps,
        uint256 totalAssets_
    ) internal {
        if (bountyBps == 0 || executor == address(0)) return;
        uint256 bounty = (totalAssets_ * bountyBps) / BPS_DENOMINATOR;
        uint256 available = IERC20(asset()).balanceOf(address(this));
        bounty = Math.min(bounty, available);
        if (bounty > 0) {
            IERC20(asset()).safeTransfer(executor, bounty);
            emit BountyPaid(executor, bounty);
        }
    }

    /// @dev Opportunistic harvest on LP adapter — silent no-op if unavailable or unprofitable
    function _maybeHarvest() internal {
        if (address(lpAdapter) == address(0)) return;
        // Low-level call: adapter's gas-gated harvestRewards() returns 0 if unprofitable
        (bool ok, bytes memory data) = address(lpAdapter).call(
            abi.encodeWithSignature("harvestRewards()")
        );
        if (ok && data.length >= 32) {
            uint256 harvested = abi.decode(data, (uint256));
            if (harvested > 0) {
                emit AutoHarvestTriggered(harvested);
            }
        }
        // Silently ignore failures — never block user deposit/withdraw
    }

    function _isConfiguredAdapter(address adapter) internal view returns (bool) {
        return
            adapter == address(asterAdapter) ||
            adapter == address(secondaryAdapter) ||
            adapter == address(lpAdapter);
    }

    function _idleAssets() internal view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + _venusUnderlyingBalance();
    }

    function _venusUnderlyingBalance() internal view returns (uint256) {
        if (address(venusVToken) == address(0) || venusExchangeRateScale == 0) return 0;

        uint256 vTokenBalance = venusVToken.balanceOf(address(this));
        if (vTokenBalance == 0) return 0;

        return (vTokenBalance * venusVToken.exchangeRateStored()) / venusExchangeRateScale;
    }

    function _availableIdleForDeployment(uint256 bufferTarget_) internal view returns (uint256) {
        uint256 idle = _idleAssets();
        return idle > bufferTarget_ ? idle - bufferTarget_ : 0;
    }

    function _ensureRawLiquidity(uint256 neededRaw, uint256 bufferTarget_) internal {
        if (neededRaw == 0 || address(venusVToken) == address(0)) return;

        uint256 raw = IERC20(asset()).balanceOf(address(this));
        if (raw >= neededRaw) return;

        uint256 missing = neededRaw - raw;
        uint256 venusIdle = _venusUnderlyingBalance();
        uint256 deployable = _availableIdleForDeployment(bufferTarget_);

        uint256 redeemAmount = Math.min(missing, Math.min(venusIdle, deployable));
        if (redeemAmount > 0) _redeemFromVenus(redeemAmount);
    }

    function _parkIdleInVenus(uint256 bufferTarget_) internal {
        if (address(venusVToken) == address(0)) return;

        uint256 raw = IERC20(asset()).balanceOf(address(this));
        if (raw == 0) return;

        uint256 deployable = _availableIdleForDeployment(bufferTarget_);
        uint256 keepRaw = Math.min(raw, deployable);
        uint256 toMint = raw - keepRaw;

        if (toMint > 0) _mintToVenus(toMint);
    }

    function _mintToVenus(uint256 amount) internal {
        uint256 result = venusVToken.mint(amount);
        if (result != 0) revert ProofVault__VenusMintFailed(result);
    }

    function _redeemFromVenus(uint256 amount) internal {
        uint256 result = venusVToken.redeemUnderlying(amount);
        if (result != 0) revert ProofVault__VenusRedeemFailed(result);
    }
}
