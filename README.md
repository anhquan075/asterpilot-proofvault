<p align="center">
  <img src="frontend/public/logo.svg" alt="AsterPilot ProofVault" width="120" height="120" />
  <br /><br />
  <img src="https://img.shields.io/badge/BNB_Chain-Mainnet_Ready-F0B90B?style=for-the-badge&logo=binance" alt="BNB Chain" />
  <img src="https://img.shields.io/badge/Security-ZK_Verified-4CAF50?style=for-the-badge" alt="ZK Security" />
</p>

# AsterPilot ProofVault

Autonomous, non-custodial yield routing stack on BNB Chain.

**🚀 Live dApp:** [https://asterpilot-proofvault.vercel.app](https://asterpilot-proofvault.vercel.app)

This README reflects the current deployed institutional architecture (3-rail vault + risk engine + execution auction + omnichain routing).

## What This System Is

AsterPilot ProofVault is an ERC-4626 vault that routes USDT across three rails under a permissionless execution model:

1. Primary rail: `AsterEarnAdapterWithSwap` (USDT -> USDF swap, then async Aster minter integration).
2. Secondary rail (Buffer): `VenusYieldAdapter` (Idle USDT is routed to Venus Protocol vUSDT for 100% capital efficiency).
3. LP rail: `StableSwapLPYieldAdapterWithFarm` (StableSwap LP + MasterChef farm + CAKE harvest).

Core policy and safety are on-chain:

- `StrategyEngine` computes state and target allocations, utilizing `StrategyEngineFlashLoan` to execute atomic regime shifts via PancakeSwap V3 flash callbacks (eliminating idle capital and double-slippage).
- `RiskPolicy` stores immutable thresholds/targets.
- `CircuitBreaker` auto-trips/recovers from three market signals.
- `SharpeTracker` records rolling risk-adjusted performance observations.
- `ZKRiskOracle` accepts cryptographically verified off-chain Monte Carlo simulations from ZK-Coprocessors (like Brevis or Axiom) to dynamically adjust Hysteresis bands.
- `ExecutionAuction` auctions rebalance rights and forwards bid revenue/bounties.
- `OmnichainZapReceiver` allows users on any Layer 2 (Arbitrum, Base, Optimism) to bridge and deposit into the BNB Chain vault in a single transaction via LayerZero/Stargate.
## Contract Architecture (Current)

| Contract | Role |
| --- | --- |
| `ProofVault` | ERC-4626 vault, liquidity manager, and rebalance executor (`onlyEngine`) |
| `StrategyEngine` | Permissionless `executeCycle()` decision engine |
| `StrategyEngineFlashLoan` | PancakeSwap V3 flash callback for atomic capital shifts between adapters |
| `AsterEarnAdapterWithSwap` | Primary Aster rail with USDT/USDF swap and async withdraw claims |
| `VenusYieldAdapter` | Secondary rail buffer adapter integrating Venus Protocol (`vUSDT`) |
| `StableSwapLPYieldAdapterWithFarm` | LP + farm rail, permissionless CAKE harvest path |
| `RiskPolicy` | Immutable risk and allocation parameters |
| `ChainlinkPriceOracle` | Chainlink wrapper with staleness/validity checks |
| `ZKRiskOracle` | ZK-Coprocessor endpoint for off-chain verified Monte Carlo risk bounds |
| `CircuitBreaker` | Triple-signal breaker (price deviation, reserve ratio, virtual price drawdown) |
| `SharpeTracker` | Rolling yield observations + Sharpe/Sortino calculations |
| `PegArbExecutor` | Permissionless peg-arb executor returning net profit to vault |
| `ExecutionAuction` | Rebalance Rights Auction overlay for `executeCycle()` |
| `OmnichainZapReceiver` | Cross-chain intent gateway via Stargate/LayerZero |
## Mermaid: System Topology

```mermaid
graph LR
    L2User[Omnichain Users] --> Zap[OmnichainZapReceiver]
    Zap --> Vault[ProofVault]
    User[BNB Chain Users] --> Vault
    Searcher[Executors] --> Engine[StrategyEngine.executeCycle]
    Searcher --> Auction[ExecutionAuction]

    Auction --> Engine
    Engine --> Flash[StrategyEngineFlashLoan]
    Engine --> Breaker[CircuitBreaker]
    Engine --> Oracle[ChainlinkPriceOracle]
    Engine --> Policy[RiskPolicy]
    Engine --> Sharpe[SharpeTracker]
    Engine --> Vault

    ZKCoprocessor[ZK Coprocessor / Brevis] -.-> ZKOracle[ZKRiskOracle]
    ZKOracle --> Policy

    Vault --> Aster[AsterEarnAdapterWithSwap]
    Vault --> Secondary[VenusYieldAdapter]
    Vault --> LP[StableSwapLPYieldAdapterWithFarm]
    Vault --> Arb[PegArbExecutor]

    Aster --> Router[Pancake Router]
    Aster --> Minter[Aster Minter]
    LP --> Pool[StableSwap Pool]
    LP --> Chef[MasterChef]
    Secondary --> Venus[Venus Protocol vUSDT]
    Flash --> PCSv3[PancakeSwap V3 Pool]
```

## Mermaid: Rebalance Execution Flow

```mermaid
sequenceDiagram
    participant EOA as Any Caller
    participant EA as ExecutionAuction
    participant SE as StrategyEngine
    participant CB as CircuitBreaker
    participant OR as ChainlinkPriceOracle
    participant ST as SharpeTracker
    participant PV as ProofVault
    participant AA as AsterEarnAdapterWithSwap
    participant MA as ManagedAdapter
    participant LA as StableSwapLPYieldAdapterWithFarm

    alt Auction path
        EOA->>EA: winnerExecute() / fallbackExecute()
        EA->>SE: executeCycle()
    else Direct path
        EOA->>SE: executeCycle()
    end

    SE->>CB: checkBreaker()
    SE->>OR: getPrice()
    SE->>ST: recordYield(...)
    SE->>PV: rebalance(asterBps, slippage, executor, bountyBps, lpBps)

    PV->>MA: withdrawToVault(...) (if needed)
    PV->>AA: onVaultDeposit(...) / requestWithdraw(...)
    PV->>LA: onVaultDeposit(...) / withdrawToVault(...)
    PV-->>EOA: executor bounty transfer

    opt Auction path completion
        EA-->>EOA: auction bounty payout
        EA-->>PV: winning bid transfer
    end
```

## Latest Mainnet Deployment (BNB Chain, Chain ID 56)

### Core

| Contract | Address |
| --- | --- |
| `ProofVault` | [`0x69FA0e6bc9b412EB5c90516c4E684EF596c2424d`](https://bscscan.com/address/0x69FA0e6bc9b412EB5c90516c4E684EF596c2424d) |
| `StrategyEngine` | [`0x2414959E51E4f3459A114DEA7b3f4Da83c9849aa`](https://bscscan.com/address/0x2414959E51E4f3459A114DEA7b3f4Da83c9849aa) |
| `RiskPolicy` | [`0xE37AAAc34307A3EF7F38e019b28018e720E037Dc`](https://bscscan.com/address/0xE37AAAc34307A3EF7F38e019b28018e720E037Dc) |
| `ChainlinkPriceOracle` | [`0xFC0b07a4C06b72db57297eEC11c79e658EFE3A5a`](https://bscscan.com/address/0xFC0b07a4C06b72db57297eEC11c79e658EFE3A5a) |
| `CircuitBreaker` | [`0x74bda872E528c58D66d5DBd9Bb9072b06d99f510`](https://bscscan.com/address/0x74bda872E528c58D66d5DBd9Bb9072b06d99f510) |
| `SharpeTracker` | [`0x61b8f2BbF3863b1c07f42Ac76fB899B7eF483bD6`](https://bscscan.com/address/0x61b8f2BbF3863b1c07f42Ac76fB899B7eF483bD6) |

### Adapters and Executors

| Contract | Address |
| --- | --- |
| `AsterEarnAdapterWithSwap` | [`0x05CF9BC006f21fe7e87d1058f606aF876E52f95E`](https://bscscan.com/address/0x05CF9BC006f21fe7e87d1058f606aF876E52f95E) |
| `ManagedAdapter` | [`0x5FdeED968470602328d896b4db6b7C0F5BA867E5`](https://bscscan.com/address/0x5FdeED968470602328d896b4db6b7C0F5BA867E5) |
| `StableSwapLPYieldAdapterWithFarm` | [`0xA6974768f90d579573faaE512e6a613464e4963c`](https://bscscan.com/address/0xA6974768f90d579573faaE512e6a613464e4963c) |
| `PegArbExecutor` | [`0x5036cA3FB2Ff95A813c262831A6023CB527666d3`](https://bscscan.com/address/0x5036cA3FB2Ff95A813c262831A6023CB527666d3) |
| `ExecutionAuction` | [`0xA7207caCEA25b8a9BFf289C8aCCcD257C862314D`](https://bscscan.com/address/0xA7207caCEA25b8a9BFf289C8aCCcD257C862314D) |

### Key Integration Addresses

- USDT: `0x55d398326f99059fF775485246999027B3197955`
- USDF: `0xc271fc70dd9e678a6a43a982f436e12d4a63c0a5`
- StableSwap Pool: `0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57`
- Pancake Router: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- MasterChef: `0x556B9306565093C855AEA9AE92A594704c2Cd59e`
- CAKE: `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82`

## Recent Fix Included in This Architecture

`AsterEarnAdapterWithSwap` claim path is now aligned with vault liquidity expectations:

- `claimAllMatured()` is `onlyVault`.
- Matured USDF claims are swapped back to USDT.
- Swapped USDT is transferred back to vault.
- `managedAssets()` includes idle input/output balances so accounting reflects claim/swap states.

## Repo Layout

```text
contracts/
├── ProofVault.sol
├── StrategyEngine.sol
├── RiskPolicy.sol
├── ChainlinkPriceOracle.sol
├── CircuitBreaker.sol
├── SharpeTracker.sol
├── AsterEarnAdapterWithSwap.sol
├── ManagedAdapter.sol
├── StableSwapLPYieldAdapterWithFarm.sol
├── PegArbExecutor.sol
├── ExecutionAuction.sol
└── interfaces/

scripts/
├── deployFullStackWithFarm.js
├── deployExecutionAuction.js
├── deployFullStackWithLpRail.js
├── deployFullStack.js
└── ...

frontend/
└── lib/contractAddresses.js
```

## Development

### Install and Test

```bash
npm install
npx hardhat compile
npx hardhat test
```

### Deploy Full Stack (Mainnet)

```bash
# requires V2_* env vars for core + farm params
npx hardhat run scripts/deployFullStackWithFarm.js --network bnb
```

### Deploy ExecutionAuction (against deployed vault/engine)

```bash
V2_ENGINE_ADDRESS=<engine> \
V2_VAULT_ADDRESS=<vault> \
V2_ASSET_ADDRESS=0x55d398326f99059fF775485246999027B3197955 \
npx hardhat run scripts/deployExecutionAuction.js --network bnb
```

### Frontend Address Source

`frontend/lib/contractAddresses.js` is the canonical frontend mapping for deployed addresses.

## Security Posture

- Ownership is renounced after configuration lock on vault/adapters.
- Reentrancy protection on state-changing paths where required.
- Slippage checks enforced on rebalance.
- Oracle staleness and price validity checks enforced.
- Circuit breaker can block execution under stressed market signals.
