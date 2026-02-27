# ProofVault V2 — BSC Mainnet Address Registry

Deployed: 2026-02-27
Deployer: `0xB789D888A53D34f6701C1A5876101Cb32dbF17cF`
Script: `scripts/deploy-mainnet-full-stack.js`
Chain: BNB Chain Mainnet (Chain ID 56)
Gas price: 0.1 gwei

## V2 Contracts

| Contract                   | Address                                      |
| -------------------------- | -------------------------------------------- |
| ProofVault                 | `0xD81fCB29b09aD7d72AD53E9f842AB16989fb7175` |
| StrategyEngine             | `0x8e64C7Da37814d8A9f99a66719a92701c3263342` |
| RiskPolicy                 | `0x572D5DB8F76A23B969b6aeA13557A6Ce24583131` |
| ChainlinkPriceOracle       | `0xdAD39Eccf4d9B479b62258924A29af1C1134aF4a` |
| CircuitBreaker             | `0x54CB320C14b486e2F9ebf0479720Ec0e2B3575fB` |
| SharpeTracker              | `0x069a30d0AB051db5208DdE515D6B8622a31F9358` |
| AsterEarnAdapter           | `0xE2942aCc4B18F77Ba35a64d9020E6E1061108A15` |
| ManagedAdapter (secondary) | `0x17B959816e2AfD8A2178B9ACAbC7EB7739DfF8D5` |
| PegArbExecutor             | `0xb6FE71870dD5Ecc6AC5f4170cf3890B2fAB1b778` |
| ExecutionAuction           | `0x364Efe8C3C9d93499F5f67112E85946f3F0e9Cec` |
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
| Circuit breaker Signal B      | 100 bps reserve imbalance  |
| Circuit breaker Signal C      | 50 bps virtual price drop  |
| CB recovery cooldown          | 3600s (1 hr)               |

## BscScan Verification

```bash
npx hardhat verify --network bnb 0xD81fCB29b09aD7d72AD53E9f842AB16989fb7175 \
  "0x55d398326f99059fF775485246999027B3197955" \
  "AsterPilot ProofVault V2 Share" \
  "apvV2SHARE" \
  "0xB789D888A53D34f6701C1A5876101Cb32dbF17cF" \
  500
```
