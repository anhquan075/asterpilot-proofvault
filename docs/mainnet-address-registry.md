# Mainnet Address Registry

Network: BNB Mainnet (chainId 56)

## Core stack (v11 — NEW V1 DEPLOYMENT)

Deployed: February 23, 2026 with `npm run deploy:aster:stack`

- Vault: `0x721882D98194D5177F2336Bd97f50ABA44410365`
- StrategyEngine: `0xd5ff531870c75FA29f495e70E0D406a207018D02`
- RiskPolicy: `0x6b8776492e529fe1e33Df0Af42ffb7430F34660e`
- Oracle: `0xD47B776e957687D1789d813eBeF79149658d00F0`
- AsterAdapter: `0x3cCcB5E20193affc9E4C1C1aa5Aee425F0FfB049`
- SecondaryAdapter: `0x8A7cb0F7e04028EF7cb4189175B29FB370e9A4eC`

**Status:** ✅ All locked + non-custodial (all owners = 0x0000...)

## Core stack (v10 — PREVIOUS DEPLOYMENT)

Deployed with: `npm run deploy:aster:stack`
 Vault: `0x408Cb74585F98cE0F9bf4aF7235E6665D94C82B0`
 StrategyEngine: `0x186d6b58CBdB7DCa99d9ca38E77D021AB099f78a`
 RiskPolicy: `0xf6B674617A11c23dC420e05D1EE65AA0f8684D9E`
 Oracle: `0x1d69734B0aea7F4D89fd1C4a65ed8f2e92985FB7`
 AsterAdapter: `0x44CF8bcAD7ff72B0F5d5448d0C39571717BC9790`
 SecondaryAdapter: `0x30a41053cf55f978Fd385d35B43E04A03f878752`

## ProofVault V2 Stack (NEW - Live on BNB Mainnet)

Deployed: February 23, 2026 with `deploy-v2-full-stack.js`

**Core Contracts:**
- **Vault:** `0xaB4F67AfCb9B9C390049705022A0237E81465C00`
- **StrategyEngine:** `0x39085f39f1f55Aefdea8C35864dba460aCbC4c18`
- **RiskPolicy:** `0x1CD27035829a59fEB026D986726f0Db7E110a1f1`
- **Oracle:** `0x3e849369bC4BB891EB5840f0232d365f1C63e10a`
- **CircuitBreaker:** `0xDAA5E51EEaF01895476CB2088d4093c0894079Cd`
- **SharpeTracker:** `0x04247373A4d6cB929b3d81a227Bc3e45396481bB`

**Adapters:**
- **AsterEarnAdapterV2:** `0x5De1fEcBB3f1F8c935Ad44F5894aF24e3a2a4e24`
- **SecondaryAdapter:** `0xD60543EdDbee67dfD56Cbb5a35482dc77e9a24F1`

**Arbitrage:**
- **PegArbExecutor:** `0x1c2A74Ec3bE210a8104fc61403C613513881B0bc`

**Status:** ✅ All locked + non-custodial (all owners = 0x0000...)

## Asset

- Asset token: `0x917AF46B3C3c6e1Bb7286B9F59637Fb7C65851Fb` (asUSDF - Aster Staked USDF = ERC-4626 Vault)

## Oracle

- Mode: Chainlink
- Feed: USDT/USD on BSC mainnet (`0xB97Ad0E74fa7d920791E90258A6E2085088b4320`)

## AsterDEX Integration (FIXED: Correct selectors from verified transactions)

 Aster minter: `0xdB57a53C428a9faFcbFefFB6dd80d0f427543695` (asUSDF Minting Contract)
 Deposit selector: `0xb6b55f25` (verified from tx 0x121bfd3e...)
 Withdraw selector: `0xeb9259ef` (verified from tx 0xc4b33c33...)
 Managed assets: **Not applicable** (adapter queries asUSDF.balanceOf(address(this)))

**Critical fix (v9):**
 Deposit selector corrected from 0x6e553f65 to 0xb6b55f25
 Withdraw selector corrected from 0x4ceaa7f2 to 0xeb9259ef
 AsterEarnAdapter.managedAssets() modified to return _asset.balanceOf(address(this))
 No longer calls minter for managed assets (minter has no public query function)

**Key discovery (Feb 2026):**
- The previous address `0xdB57a53...` is a Logic Contract (implementation), NOT a Proxy
- asUSDF Token (`0x917AF46...`) is itself an ERC-4626 Vault with Transparent Proxy pattern
- We must call the asUSDF token directly using ERC-4626 interface, not a separate minter

## Lock/non-custodial verification

- Vault owner: `0x0000000000000000000000000000000000000000` ✅
- Aster adapter owner: `0x0000000000000000000000000000000000000000` ✅
- Secondary adapter owner: `0x0000000000000000000000000000000000000000` ✅
- Oracle locked: `true` ✅
