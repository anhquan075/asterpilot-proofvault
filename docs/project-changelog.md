# AsterPilot ProofVault Project Changelog

## [2.1.0] - 2026-03-12 (Polkadot Hub Adaptation)

### Added
- **Polkadot Hub Adapter Stack**:
  - `MoonwellERC4626Adapter`: Synchronous ERC-4626 adapter for Moonwell USDC vault.
  - `MoonwellLendingAdapter`: Compound-style adapter for Moonwell lending markets.
  - `BeamSwapFarmAdapter`: BeamSwap StableSwap LP staking adapter for GLINT rewards.
  - `MoonwellPriceOracle`: Chainlink-based oracle for Polkadot Hub assets.
- **XCM Integration**: `CrossChainMessenger` contract for XCM precompile interaction and emergency relay exits.
- **Paseo Asset Hub Configuration**: Full network setup in `hardhat.config.js` and `frontend/lib/networkConfig.js`.
- **Integrated Polkadot Hub Test Suite**: 253 comprehensive tests covering all adapters and full cycle flows.

### Changed
- **Refactored Aster Adapter**: Migrated from asynchronous withdrawal (request/claim) to synchronous ERC-4626 pattern in `MoonwellERC4626Adapter`.
- **Updated README**: Added Polkadot Hub address table and network instructions.
- **Fixed Mock StableSwap**: Resolved decimal scaling issues (6 → 18) for LP tokens in test mocks.

### Performance
- **Gas Savings**: Synchronous refactor saves ~150k gas per `executeCycle`.
- **Benchmark Results**:
  - `onVaultDeposit` (Moonwell): ~117k gas
  - `withdrawToVault` (Moonwell): ~64k gas
  - `executeCycle` (Full 3-rail): ~678k gas

## [2.0.0] - 2025-11-15 (BNB Chain V2)

### Added
- **RRA (Rebalance Rights Auction)**: ExecutionAuction contract for permissionless strategy triggering.
- **Sharpe Tracker**: On-chain yield monitoring and performance tracking.
- **3-Rail Waterfall**: Unified rebalancing across Aster, Secondary, and LP rails.
- **Dutch Auction Bounty**: Time-increasing bounty for rebalance execution.

## [1.0.0] - 2024-06-01 (BNB Chain V1)

### Added
- **Core ProofVault**: ERC-4626 compliant vault with risk-based routing.
- **StrategyEngine**: Initial automated rebalancing engine.
- **RiskPolicy**: Policy management for yield rail allocations.
- **Mainnet Launch**: First production deployment on BNB Chain.
