<p align="center">
  <img src="frontend/public/logo.svg" alt="AsterPilot ProofVault" width="120" height="120" />
  <br /><br />
  <img src="https://img.shields.io/badge/Polkadot_Hub-Paseo_Deployed-E6007A?style=for-the-badge&logo=polkadot" alt="Polkadot Hub" />
  <img src="https://img.shields.io/badge/BNB_Chain-Mainnet_Ready-F0B90B?style=for-the-badge&logo=binance" alt="BNB Chain" />
  <img src="https://img.shields.io/badge/Creditcoin_L1-Testnet_Deployed-0052FF?style=for-the-badge&logo=polkadot" alt="Creditcoin L1" />
</p>

# AsterPilot ProofVault: Multi-Chain Liquidity Hub

**The autonomous, cross-chain yield layer for the next generation of finance.**

AsterPilot ProofVault is a non-custodial capital routing stack that automates liquidity management across four critical ecosystems: **Polkadot Hub**, **BNB Chain**, **Aster (Astherus)**, and **Creditcoin (CTC)**. It acts as an intelligent "yield autopilot," moving assets between RWA loan fulfillment, stablecoin yield protocols, and decentralized exchange liquidity pools based on real-time risk signals.

---

## 🌐 Network Support Matrix

| Ecosystem | Primary Role | Target Network | Status |
| :--- | :--- | :--- | :--- |
| **Polkadot Hub** | Native Interop Hub | Paseo Asset Hub | **Verified & Secure** |
| **BNB Chain** | High-Yield Growth Rail | BNB Smart Chain | **Mainnet Live** |
| **Aster (Astherus)** | Native USDF Yield | AstherLayer (Upcoming) | **Integrated** |
| **Creditcoin (CTC)** | RWA Loan Fulfillment | Creditcoin L1 (Hella) | **Testnet Ready** |

---

## 🏆 Polkadot Solidity Hackathon 2026

AsterPilot leverages the **Polkadot Hub (Asset Hub)** to provide institutional-grade yield management with native XCM protection and synchronous ERC-4626 adapters.

### Track Alignment:
1.  **Track 1 (EVM Track):** Production-ready DeFi vault managing yields via Moonwell and BeamSwap on Polkadot Hub.
2.  **Track 2 (PVM Track):** Deep integration with Polkadot **XCM Precompiles** for automated emergency exits.

### Native Polkadot Features:
- **XCM Protection:** Automated "Emergency Exit" to the Relay Chain via native XCM messages.
- **Shared Security:** Inherits Polkadot's L0 security model.
- **Asset Hub Native:** Operates directly on the Asset Hub for maximum interoperability.

---

## Deployed on Polkadot Hub (Paseo Asset Hub)

- **Chain ID:** `420420417` | **RPC:** `https://services.polkadothub-rpc.com/testnet`

| Contract | Address |
| :--- | :--- |
| `ProofVault` | [`0x071958E16A54E3a963d17FdeEf2e6938CB8fbB10`](https://paseo.moonscan.io/address/0x071958E16A54E3a963d17FdeEf2e6938CB8fbB10) |
| `StrategyEngine` | [`0x4dDf07b881Bd0B7cc93deB9D2a7A3c5a6cE094ba`](https://paseo.moonscan.io/address/0x4dDf07b881Bd0B7cc93deB9D2a7A3c5a6cE094ba) |
| `MoonwellERC4626Adapter` | [`0x4695ef4ADE0D065C8901870876e75fE7b13210E3`](https://paseo.moonscan.io/address/0x4695ef4ADE0D065C8901870876e75fE7b13210E3) |
| `MoonwellLendingAdapter` | [`0x76505B830098302e94906Bd5a77B89569bCc7498`](https://paseo.moonscan.io/address/0x76505B830098302e94906Bd5a77B89569bCc7498) |
| `BeamSwapFarmAdapter` | [`0x198E9ECfaA22d8385c386038e810788c9a358c74`](https://paseo.moonscan.io/address/0x198E9ECfaA22d8385c386038e810788c9a358c74) |
| `CrossChainMessenger` | [`0x4B1f39ed7B96Ff870fF1B18f2201E21bE75f4eEf`](https://paseo.moonscan.io/address/0x4B1f39ed7B96Ff870fF1B18f2201E21bE75f4eEf) |

---

## Philosophy of Design: The Three-Rail Strategy

1. **Primary Rail — Moonwell ERC-4626:** Synchronous, low-risk institutional yield anchor.
2. **LP Rail — Moonwell Lending:** Target-based capital deployment for liquidity depth.
3. **Secondary Rail — BeamSwap Farm:** High-efficiency remainder sweep for reward optimization.

## Security Posture
- **Ownership Renounced**: Config locked post-deployment.
- **Reentrancy Protected**: All adapters fortified with `nonReentrant` guards.
- **Audit Verified**: Optimized for `pallet_revive` and Polkadot Hub gas mechanics.
