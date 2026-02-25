// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event AutoHarvestTriggered(uint256 harvested);
    event EngineSet(address indexed engine);
    event PegArbExecutorSet(address indexed pegArbExecutor);
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
    function totalAssets() public view override returns (uint256) {
        uint256 lpManaged = address(lpAdapter) != address(0)
            ? lpAdapter.managedAssets()
            : 0;
        return
            IERC20(asset()).balanceOf(address(this)) +
            asterAdapter.managedAssets() +
            secondaryAdapter.managedAssets() +
            lpManaged;
    }

    function deposit(
        uint256 assets,
        address receiver
    ) public override nonReentrant returns (uint256) {
        if (!configurationLocked) revert ProofVault__NotLocked();
        _lastDepositBlock[receiver] = block.number;
        _maybeHarvest();
        return super.deposit(assets, receiver);
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override nonReentrant returns (uint256) {
        if (!configurationLocked) revert ProofVault__NotLocked();
        _lastDepositBlock[receiver] = block.number;
        _maybeHarvest();
        return super.mint(shares, receiver);
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
    ) external onlyEngine nonReentrant {
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
            uint256 available = IERC20(asset()).balanceOf(address(this));
            if (available > buffer) {
                uint256 toSend = Math.min(deficit, available - buffer);
                IERC20(asset()).safeTransfer(address(asterAdapter), toSend);
                asterAdapter.onVaultDeposit(toSend);
            }
        } else if (currentAster > asterTarget) {
            asterAdapter.requestWithdraw(currentAster - asterTarget);
        }

        // LP rail
        _rebalanceLp(deployable, lpTargetBps, buffer);

        // Pay executor bounty (before secondary absorbs excess)
        _payExecutorBounty(executor, bountyBps, total);

        // Secondary rail: absorb remaining idle excess
        _rebalanceSecondary(buffer);


        // Slippage check: verify totalAssets didn't drop beyond acceptable threshold
        {
            uint256 postTotal = totalAssets();
            uint256 minAcceptable = (total * (BPS_DENOMINATOR - maxSlippageBps)) / BPS_DENOMINATOR;
            if (postTotal < minAcceptable) {
                revert ProofVault__SlippageExceeded(total, postTotal, maxSlippageBps);
            }
        }

        uint256 idle = IERC20(asset()).balanceOf(address(this));
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
        current = IERC20(asset()).balanceOf(address(this));
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
            uint256 idle = IERC20(asset()).balanceOf(address(this));
            if (idle > bufferTarget_) {
                uint256 toSend = Math.min(deficit, idle - bufferTarget_);
                IERC20(asset()).safeTransfer(address(lpAdapter), toSend);
                lpAdapter.onVaultDeposit(toSend);
            }
        } else if (currentLp > lpTarget) {
            lpAdapter.withdrawToVault(currentLp - lpTarget);
        }
    }

    /// @dev Move excess idle into secondary, or pull from secondary if below buffer
    function _rebalanceSecondary(uint256 bufferTarget_) internal {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle > bufferTarget_) {
            uint256 excess = idle - bufferTarget_;
            IERC20(asset()).safeTransfer(address(secondaryAdapter), excess);
            secondaryAdapter.onVaultDeposit(excess);
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
}
