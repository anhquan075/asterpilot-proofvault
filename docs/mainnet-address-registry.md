# ProofVault V2 — BSC Mainnet Address Registry

Deployed: 2026-02-27 (v2 r2 — Signal B threshold raised 100→8000 bps)
Deployer: `0xB789D888A53D34f6701C1A5876101Cb32dbF17cF`
Script: `scripts/deploy-mainnet-full-stack.js`
Chain: BNB Chain Mainnet (Chain ID 56)
Gas price: 0.1 gwei

## V2 Contracts

| Contract                   | Address                                      |
| -------------------------- | -------------------------------------------- |
| ProofVault                 | `0xf6ff5C42accaC935Ca6b83687280A1E8dc637D33` |
| StrategyEngine             | `0x0Bb17DbBF19Db46bA29e322675B5bc39e861C5a1` |
| RiskPolicy                 | `0x2C932Cb04E629bdaB84488cDeB85Ef81B73654BC` |
| ChainlinkPriceOracle       | `0x787D6B075E44CB84019410ABe4f73f1E6cCeD839` |
| CircuitBreaker             | `0x45619Dd30d5724C58B9aaa4608EeF9B32a718Fea` |
| SharpeTracker              | `0xA231a4d5bc9749FC26d109Aa3BebE8CC2b622dcF` |
| AsterEarnAdapter           | `0x1896A0A3E4a348936D8BbdA989B27321db8d1590` |
| ManagedAdapter (secondary) | `0xd03247B056a93350f820dC51E6D8502C277b4055` |
| PegArbExecutor             | `0xba5d34A2BC3ccD44598971A5C56E8FfA6BB78525` |
| ExecutionAuction           | `0xd5536970711F8304F57EdFA76f9e74e248466DC3` |
| LPAdapter                  | not deployed (V2_LP_POOL_ID not set)         |

## External Dependencies

| Name                 | Address                                      |
| -------------------- | -------------------------------------------- |
| USDT (BSC)           | `0x55d398326f99059fF775485246999027B3197955` |
| USDF                 | `0xc271fc70dd9e678a6a43a982f436e12d4a63c0a5` |
| AsterDEX Minter      | `0xdB57a53C428a9faFcbFefFB6dd80d0f427543695` |
| Chainlink USDT/USD   | `0xB97Ad0E74fa7d920791E90258A6E2085088b4320` |
| USDF/USDT StableSwap | `0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57` |

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
npx hardhat verify --network bnb 0xf6ff5C42accaC935Ca6b83687280A1E8dc637D33 \
  "0x55d398326f99059fF775485246999027B3197955" \
  "AsterPilot ProofVault V2 Share" \
  "apvV2SHARE" \
  "0xB789D888A53D34f6701C1A5876101Cb32dbF17cF" \
  500
```
