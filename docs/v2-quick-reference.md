# ProofVault V2 Quick Reference

## Mainnet Addresses (BNB Chain ID 56)

```
VAULT:              0xaB4F67AfCb9B9C390049705022A0237E81465C00
ENGINE:             0x39085f39f1f55Aefdea8C35864dba460aCbC4c18
POLICY:             0x1CD27035829a59fEB026D986726f0Db7E110a1f1
ORACLE:             0x3e849369bC4BB891EB5840f0232d365f1C63e10a
CIRCUIT_BREAKER:    0xDAA5E51EEaF01895476CB2088d4093c0894079Cd
SHARPE_TRACKER:     0x04247373A4d6cB929b3d81a227Bc3e45396481bB
ASTER_ADAPTER:      0x5De1fEcBB3f1F8c935Ad44F5894aF24e3a2a4e24
SECONDARY_ADAPTER:  0xD60543EdDbee67dfD56Cbb5a35482dc77e9a24F1
PEG_ARB_EXECUTOR:   0x1c2A74Ec3bE210a8104fc61403C613513881B0bc
EXECUTION_AUCTION:  0xD37210566698310F3620aE97151B1134bE4d352E
```

## Key Parameters

**Circuit Breaker Thresholds:**
- Signal A (Chainlink): 50 bps
- Signal B (Reserves): 100 bps
- Signal C (Virtual Price): 50 bps
- Recovery: 1 hour

**Risk Policy:**
- Cooldown: 5 minutes
- Idle Buffer: 5%
- Normal/Guarded/Drawdown: 20%/50%/70% Aster

**Dutch Auction:**
- Floor: 5 bps
- Ceiling: 100 bps
- Duration: 1 hour

**Sharpe Ratio:**
- Window: 20 cycles
- Low Threshold: 0.5

## External Addresses

```
USDT:         0x55d398326f99059fF775485246999027B3197955
USDF:         0xc271fc70dd9e678a6a43a982f436e12d4a63c0a5
MINTER:       0xdB57a53C428a9faFcbFefFB6dd80d0f427543695
POOL:         0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57
CHAINLINK:    0xB97Ad0E74fa7d920791E90258A6E2085088b4320
```

## Status

✅ All owners renounced (0x0000...)
✅ All configs locked
✅ All tests passing (123/123)
✅ Non-custodial & immutable

## Docs

- Full Deployment Summary: `./docs/v2-deployment-summary.md`
- Address Registry: `./docs/mainnet-address-registry.md`
- Deployment Config: `./.env` (params)
