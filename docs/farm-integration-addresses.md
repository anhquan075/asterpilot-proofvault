# Farm Integration - Verified BNB Chain Addresses

Last updated: February 23, 2026

## Core Tokens

| Token | Symbol | Address | Source |
|-------|--------|---------|--------|
| Tether USD | USDT | `0x55d398326f99059fF775485246999027B3197955` | Known (verified) |
| Aster USDF | USDF | `0x5a110fc00474038f6c02e89c707d638602ea44b5` | BscScan verified |
| PancakeSwap Token | CAKE | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` | Known (verified) |

## PancakeSwap Contracts

| Contract | Address | Source |
|----------|---------|--------|
| PancakeSwap Router V2 | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | Known (verified) |
| MasterChef V3 | `0x556B9306565093C855AEA9AE92A594704c2Cd59e` | PancakeSwap docs verified |

## Pools & LP Tokens

| Pool | Status | Notes |
|------|--------|-------|
| USDF/USDT StableSwap | ❌ NOT FOUND | Need to verify if this pool exists on PancakeSwap |
| USDF/USDT LP Token | ❌ UNKNOWN | Depends on pool existence |
| MasterChef Pool ID | ❌ UNKNOWN | Depends on pool existence |

## Verification Notes

### ✅ Verified
- **USDF Token**: Confirmed at `0x5a110fc00474038f6c02e89c707d638602ea44b5` (BscScan shows "Astherus USDF")
- **MasterChef V3**: Confirmed at `0x556B9306565093C855AEA9AE92A594704c2Cd59e` (PancakeSwap official docs)
- **CAKE Token**: Standard address verified
- **PancakeSwap Router V2**: Standard address verified

### ⚠️ Needs Manual Verification
1. **USDF/USDT StableSwap Pool**: 
   - Search did not find a specific USDF/USDT StableSwap pool
   - **Action required**: Visit PancakeSwap UI to check if pool exists
   - **Alternative**: May need to use regular V2/V3 pool instead of StableSwap

2. **LP Token Address**:
   - On PancakeSwap StableSwap, the pool address IS the LP token (pool is ERC20)
   - Need to confirm pool exists first

3. **MasterChef Pool ID**:
   - Must query MasterChef contract or PancakeSwap farms UI
   - Cannot determine without knowing the pool address

## Deployment Checklist

Before running `deploy-v2-full-stack-with-farm.js`:

- [ ] Confirm USDF/USDT pool exists on PancakeSwap
- [ ] Get exact pool address from PancakeSwap UI
- [ ] Find pool ID in MasterChef (check PancakeSwap Farms page)
- [ ] Verify pool has active CAKE rewards
- [ ] Check pool liquidity is sufficient

## Alternative Approach

If USDF/USDT StableSwap pool doesn't exist:

1. **Use regular V2/V3 pool**: Modify `StableSwapLPYieldAdapterWithFarm` to work with Uniswap V2-style pools
2. **Skip LP staking**: Deploy without farm integration initially
3. **Contact AsterDEX**: Verify if they have recommended liquidity pools for USDF

## Next Steps

1. Visit https://pancakeswap.finance/liquidity to search for USDF/USDT pool
2. If pool exists, note the pool address
3. Visit https://pancakeswap.finance/farms to find the pool ID
4. Update deployment script with verified addresses
