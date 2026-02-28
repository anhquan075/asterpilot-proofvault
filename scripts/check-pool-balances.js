const { ethers } = require("hardhat");

async function main() {
  const poolAddr = "0xDB17Fd18384a7d4c8Cc0368Bd03123cfCA83357a";
  const pool = await ethers.getContractAt(
    "MockStableSwapPoolWithLPSupport",
    poolAddr
  );

  const balances = await pool.get_balances();
  console.log("--- Pool Balances (Testnet) ---");
  console.log("Balance 0 (USDF):", ethers.formatUnits(balances[0], 18));
  console.log("Balance 1 (USDT):", ethers.formatUnits(balances[1], 18));

  const impliedPrice = (balances[0] * BigInt(1e18)) / balances[1];
  console.log(
    "Implied Price (USDT per USDF):",
    ethers.formatUnits(impliedPrice, 18)
  );
}

main().catch(console.error);
