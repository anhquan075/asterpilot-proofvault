const { ethers } = require("hardhat");

async function main() {
  const poolAddr = "0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57";
  const pool = await ethers.getContractAt(
    [
      "function coins(uint256) view returns (address)",
      "function balances(uint256) view returns (uint256)",
    ],
    poolAddr
  );

  try {
    const coin0 = await pool.coins(0);
    const coin1 = await pool.coins(1);
    console.log("Coin 0:", coin0);
    console.log("Coin 1:", coin1);

    const bal0 = await pool.balances(0);
    const bal1 = await pool.balances(1);
    console.log("Balance 0:", ethers.formatUnits(bal0, 18));
    console.log("Balance 1:", ethers.formatUnits(bal1, 18));
  } catch (e) {
    console.error("Failed to query pool:", e.message);
  }
}

main().catch(console.error);
