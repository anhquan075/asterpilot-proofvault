# ProofVault V2 — BSC Mainnet Address Registry

Deployed: 2026-02-27 (v2 r4 — AsterEarnAdapterWithSwap uses StableSwap pool for USDT→USDF)
Deployer: `0xB789D888A53D34f6701C1A5876101Cb32dbF17cF`
Script: `scripts/deploy-mainnet-full-stack.js`
Chain: BNB Chain Mainnet (Chain ID 56)
Gas price: 0.1 gwei

## V2 Contracts

| Contract                   | Address                                      |
| -------------------------- | -------------------------------------------- |
| ProofVault                 | `0x6E31A7F5b2565cDA914E9bd16e5d1e44E2390685` |
| StrategyEngine             | `0x2E0165Cc82c12791E9De65FdcaA5aEC50119E810` |
| RiskPolicy                 | `0x0e4068228bF6bFA1e82793C9B0e10975E25BA55f` |
| ChainlinkPriceOracle       | `0x2eA7D18072954e1A2847f28FA1f267d6F327672a` |
| CircuitBreaker             | `0x762862eaea188D8fc73Ce980280981F7bD70fe4E` |
| SharpeTracker              | `0x90173165243E5758A8fCdB338Cc06542cD1f2CB5` |
| AsterEarnAdapter           | `0x9C1EC45318C5dd039d00610e53567CB387A3361c` |
| ManagedAdapter (secondary) | `0xAdF903cA29eE03C2a313844452663aB31c10d93e` |
| StableSwapLPAdapter        | `0x4154Cf25F774AAA01530430BddF72835956B69CB` |
| PegArbExecutor             | `0x0047D91F029cf25D73f8320c4eD36a0Fa7394B11` |
| ExecutionAuction           | `0x55648020EFDA1D768aEaDa4f621049091441C1B0` |

## External Dependencies

| Name                 | Address                                      |
| -------------------- | -------------------------------------------- |
| USDT (BSC)           | `0x55d398326f99059fF775485246999027B3197955` |
| USDF                 | `0xc271fc70dd9e678a6a43a982f436e12d4a63c0a5` |
| AsterDEX Minter      | `0xdB57a53C428a9faFcbFefFB6dd80d0f427543695` |
| Chainlink USDT/USD   | `0xB97Ad0E74fa7d920791E90258A6E2085088b4320` |
| USDF/USDT StableSwap | `0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57` |
| MasterChef (LP farm) | `0x556B9306565093C855AEA9AE92A594704c2Cd59e` |
| LP Pool ID           | 69                                           |

## Configuration

| Parameter                     | Value                      |
| ----------------------------- | -------------------------- |
| Rail 1 (Aster) bps — Normal   | 2000 (20%)                 |
| Rail 1 (Aster) bps — Guarded  | 5000 (50%)                 |
| Rail 1 (Aster) bps — Drawdown | 7000 (70%)                 |
| Idle buffer                   | 500 bps (5%)               |
| Cycle cooldown                | 300s (5 min)               |
| Guarded volatility threshold  | 150 bps (1.5%)             |
| Drawdown volatility threshold | 500 bps (5%)               |
| Depeg price                   | $0.97                      |
| Sharpe window                 | 20 cycles                  |
| Circuit breaker Signal A      | 50 bps Chainlink deviation |
| Circuit breaker Signal B      | 8000 bps reserve imbalance |
| Circuit breaker Signal C      | 50 bps virtual price drop  |
| CB recovery cooldown          | 3600s (1 hr)               |

## BscScan Verification

```bash
npx hardhat verify --network bnb 0x6E31A7F5b2565cDA914E9bd16e5d1e44E2390685 \
  "0x55d398326f99059fF775485246999027B3197955" \
  "AsterPilot ProofVault V2 Share" \
  "apvV2SHARE" \
  "0xB789D888A53D34f6701C1A5876101Cb32dbF17cF" \
  500
```
