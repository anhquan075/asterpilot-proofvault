/**
 * seed-mock-pancake-router-usdt-usdf-reserves.js
 *
 * Seeds the MockPancakeRouter with USDT/USDF reserves so the AsterEarnAdapterWithSwap
 * can execute USDT → USDF swaps during vault cycle execution.
 *
 * Root cause: MockPancakeRouter.swapExactTokensForTokens() reverts with "No reserves"
 * because setReserves() was never called after deployment.
 *
 * Fix:
 *  1. Discover addresses: router from asterAdapter.router(), USDF from pool.token0()
 *  2. Mint USDF tokens to the router (so it can pay out on swaps)
 *  3. setReserves(USDT, USDF, 10M, 10M) — establishes 1:1 price with large depth
 *  4. Seed the MockUSDFMinting with USDF too (for the deposit step after swap)
 *
 * Usage:
 *   npx hardhat run scripts/seed-mock-pancake-router-usdt-usdf-reserves.js --network bnbTestnet
 */

const { ethers } = require("hardhat");

// Known testnet addresses from V2_TESTNET_PRESET (redeployed 2026-02-27 v2)
const ASTER_ADAPTER_ADDR = "0x096148CE528701614dF518B217A430A88635d561";
const CIRCUIT_BREAKER_ADDR = "0xfB5D6f83b1a5c42dFCd3fFAF76d0eF0d5ae5cB66";
const USDT_ADDR = "0x74bda872E528c58D66d5DBd9Bb9072b06d99f510";

const SEED_AMOUNT = ethers.parseUnits("10000000", 18); // 10M tokens

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // ── 1. Discover addresses ──────────────────────────────────────────────────
  const asterAdapter = new ethers.Contract(
    ASTER_ADAPTER_ADDR,
    ["function router() view returns (address)"],
    signer
  );
  const routerAddr = await asterAdapter.router();
  console.log("Router:        ", routerAddr);

  const circuitBreaker = new ethers.Contract(
    CIRCUIT_BREAKER_ADDR,
    ["function stableSwapPool() view returns (address)"],
    signer
  );
  const poolAddr = await circuitBreaker.stableSwapPool();
  console.log("StableSwapPool:", poolAddr);

  const pool = new ethers.Contract(
    poolAddr,
    [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
    ],
    signer
  );
  const usdfAddr = await pool.token0(); // USDF is coin 0
  const usdtCheck = await pool.token1(); // USDT is coin 1 (sanity check)
  console.log("USDF:          ", usdfAddr);
  console.log(
    "USDT (check):  ",
    usdtCheck,
    usdtCheck.toLowerCase() === USDT_ADDR.toLowerCase() ? "✓" : "⚠ mismatch!"
  );

  // ── 2. Mint USDF to router so it can pay out on USDT→USDF swaps ─────────────
  const usdf = new ethers.Contract(
    usdfAddr,
    [
      "function mint(address to, uint256 amount) external",
      "function balanceOf(address) view returns (uint256)",
    ],
    signer
  );
  const routerUsdfBefore = await usdf.balanceOf(routerAddr);
  console.log(
    "\nRouter USDF balance before:",
    ethers.formatUnits(routerUsdfBefore, 18)
  );

  const mintTx = await usdf.mint(routerAddr, SEED_AMOUNT);
  await mintTx.wait();
  console.log("Minted 10M USDF to router → tx:", mintTx.hash);

  // ── 3. Set reserves: USDT→USDF and USDF→USDT (both directions needed) ───────
  const router = new ethers.Contract(
    routerAddr,
    [
      "function setReserves(address tokenIn, address tokenOut, uint256 reserveIn, uint256 reserveOut) external",
      "function reserves(address, address) view returns (uint256)",
    ],
    signer
  );

  const tx1 = await router.setReserves(
    USDT_ADDR,
    usdfAddr,
    SEED_AMOUNT,
    SEED_AMOUNT
  );
  await tx1.wait();
  console.log("setReserves(USDT→USDF, 10M, 10M) → tx:", tx1.hash);

  // Verify
  const resOut = await router.reserves(USDT_ADDR, usdfAddr);
  const resIn = await router.reserves(usdfAddr, USDT_ADDR);
  console.log("Reserves USDT→USDF:", ethers.formatUnits(resOut, 18));
  console.log("Reserves USDF→USDT:", ethers.formatUnits(resIn, 18));

  // ── 4. Log summary ─────────────────────────────────────────────────────────
  const routerUsdfAfter = await usdf.balanceOf(routerAddr);
  console.log(
    "\nRouter USDF balance after:",
    ethers.formatUnits(routerUsdfAfter, 18)
  );
  console.log(
    "\n✓ MockPancakeRouter seeded. USDT→USDF swaps will now succeed."
  );
  console.log("  Re-run if reserves drop low after many cycle executions.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
