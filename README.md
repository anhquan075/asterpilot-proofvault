<p align="center">
  <img src="frontend/public/logo.svg" alt="AsterPilot ProofVault" width="120" height="120" />
</p>

# AsterPilot ProofVault

Autonomous, non-custodial yield routing stack on BNB Chain.

This README is updated to the current deployed V2 architecture (3-rail vault + risk engine + execution auction).

## What This System Is

AsterPilot ProofVault is an ERC-4626 vault that routes USDT across three rails under a permissionless execution model:

1. Primary rail: `AsterEarnAdapterWithSwap` (USDT -> USDF swap, then async Aster minter integration).
2. Secondary rail: `ManagedAdapter` (simple managed balance rail).
3. LP rail: `StableSwapLPYieldAdapterWithFarm` (StableSwap LP + MasterChef farm + CAKE harvest).

Core policy and safety are on-chain:

- `StrategyEngine` computes state and target allocations.
- `RiskPolicy` stores immutable thresholds/targets.
- `CircuitBreaker` auto-trips/recovers from three market signals.
- `SharpeTracker` records rolling risk-adjusted performance observations.
- `ExecutionAuction` auctions rebalance rights and forwards bid revenue/bounties.

## Contract Architecture (Current)

| Contract | Role |
| --- | --- |
| `ProofVault` | ERC-4626 vault, liquidity manager, and rebalance executor (`onlyEngine`) |
| `StrategyEngine` | Permissionless `executeCycle()` decision engine |
| `AsterEarnAdapterWithSwap` | Primary Aster rail with USDT/USDF swap and async withdraw claims |
| `ManagedAdapter` | Secondary rail adapter |
| `StableSwapLPYieldAdapterWithFarm` | LP + farm rail, permissionless CAKE harvest path |
| `RiskPolicy` | Immutable risk and allocation parameters |
| `ChainlinkPriceOracle` | Chainlink wrapper with staleness/validity checks |
| `CircuitBreaker` | Triple-signal breaker (price deviation, reserve ratio, virtual price drawdown) |
| `SharpeTracker` | Rolling yield observations + Sharpe/Sortino calculations |
| `PegArbExecutor` | Permissionless peg-arb executor returning net profit to vault |
| `ExecutionAuction` | Rebalance Rights Auction overlay for `executeCycle()` |

## Mermaid: System Topology

```mermaid
graph LR
    User[Users / Searchers] --> Vault[ProofVault]
    Searcher[Executors] --> Engine[StrategyEngine.executeCycle]
    Searcher --> Auction[ExecutionAuction]

    Auction --> Engine
    Engine --> Breaker[CircuitBreaker]
    Engine --> Oracle[ChainlinkPriceOracle]
    Engine --> Policy[RiskPolicy]
    Engine --> Sharpe[SharpeTracker]
    Engine --> Vault

    Vault --> Aster[AsterEarnAdapterWithSwap]
    Vault --> Secondary[ManagedAdapter]
    Vault --> LP[StableSwapLPYieldAdapterWithFarm]
    Vault --> Arb[PegArbExecutor]

    Aster --> Router[Pancake Router]
    Aster --> Minter[Aster Minter]
    LP --> Pool[StableSwap Pool]
    LP --> Chef[MasterChef]
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
| `ProofVault` | `0x380068C20898bbEc6151A0CA543Cbac5f7406D94` |
| `StrategyEngine` | `0x1525E262Cb5bDFC7b51802c36a1141bA94405F76` |
| `RiskPolicy` | `0xebeaf58f2529c4841C0A94d9B5c08E1fdEc81156` |
| `ChainlinkPriceOracle` | `0x891F37d9aC4534a77A1C2501E193d4e66D109045` |
| `CircuitBreaker` | `0x0b2AaF882E89F36F5594cfe9b561f4436ca281Fd` |
| `SharpeTracker` | `0x119f05215A8f46f6bDCc3112b6dA2B8B2871fDa2` |

### Adapters and Executors

| Contract | Address |
| --- | --- |
| `AsterEarnAdapterWithSwap` | `0x61e5e3e0C124a2F1BD7b6D34A6182f42190Cb2FB` |
| `ManagedAdapter` | `0xC4B3e9EAded16eF7F594D7C8932Ef67Ff0d9bd72` |
| `StableSwapLPYieldAdapterWithFarm` | `0x6e72AeF9701Bf5DeDF4Fc0E680a0d90cA631Ed73` |
| `PegArbExecutor` | `0xd4ebdCEB7B622B2d1D22E8634F1Ff9168e27D00C` |
| `ExecutionAuction` | `0x61AA075D27EE215d31eC9ff3d04699DBb084F55C` |

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

`frontend/lib/contractAddresses.js` is the canonical frontend mapping for V2 addresses.

## Security Posture

- Ownership is renounced after configuration lock on vault/adapters.
- Reentrancy protection on state-changing paths where required.
- Slippage checks enforced on rebalance.
- Oracle staleness and price validity checks enforced.
- Circuit breaker can block execution under stressed market signals.
