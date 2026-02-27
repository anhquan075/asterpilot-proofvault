# ProofVault V2 — BSC Mainnet Address Registry

Deployed: 2026-02-27 (v2 r3 — LP rail enabled, pool 69)
Deployer: `0xB789D888A53D34f6701C1A5876101Cb32dbF17cF`
Script: `scripts/deploy-mainnet-full-stack.js`
Chain: BNB Chain Mainnet (Chain ID 56)
Gas price: 0.1 gwei

## V2 Contracts

| Contract                   | Address                                      |
| -------------------------- | -------------------------------------------- |
| ProofVault                 | `0x2585181C92cf2b16248f74916CB7281E32Eab771` |
| StrategyEngine             | `0x96ab75cbea418ca2fc6b86D1569f71E91947f756` |
| RiskPolicy                 | `0xAAbBF69b661a3d327dE386CEF65a4214566591a7` |
| ChainlinkPriceOracle       | `0x359956Af6A71A0FB2Cf436A9CEDF4226728c9725` |
| CircuitBreaker             | `0x2E93E3d533B411733cF9F173c0e9a7A16Fc54B8E` |
| SharpeTracker              | `0x461D26B93d0298dAc819638137E4426FDF376B6d` |
| AsterEarnAdapter           | `0xbbd0f77227bCFC1791e5d51098243B36c600f954` |
| ManagedAdapter (secondary) | `0xA88e397DE1CC0787C1b2efF8EC5A215FE4145858` |
| StableSwapLPAdapter        | `0x577CE23B0991F82240057e7A1c74272fbf768790` |
| PegArbExecutor             | `0x54e0361ED0E737E1B0163103e6b7C919523A2043` |
| ExecutionAuction           | `0x1Cc719a414d56A5C38936743d4a518382f935d51` |

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
npx hardhat verify --network bnb 0x2585181C92cf2b16248f74916CB7281E32Eab771 \
  "0x55d398326f99059fF775485246999027B3197955" \
  "AsterPilot ProofVault V2 Share" \
  "apvV2SHARE" \
  "0xB789D888A53D34f6701C1A5876101Cb32dbF17cF" \
  500
```
