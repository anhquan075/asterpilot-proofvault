const { ethers } = require("hardhat");

async function main() {
  const txHash =
    "0xa48b47bce4a9a1c97f7c815debb7658bd965a2296d3cded7063906abf9798158";
  const receipt = await ethers.provider.getTransactionReceipt(txHash);

  if (!receipt) {
    console.log("Transaction not found");
    return;
  }

  console.log(
    "Transaction Status:",
    receipt.status === 1 ? "SUCCESS" : "FAILED"
  );
  console.log("Block Number:", receipt.blockNumber);

  if (receipt.status === 0) {
    console.log("Attempting to trace revert...");
    const tx = await ethers.provider.getTransaction(txHash);
    try {
      await ethers.provider.call(tx, tx.blockNumber);
    } catch (err) {
      console.log("Revert reason:", err.message);
    }
  }
}

main().catch(console.error);
