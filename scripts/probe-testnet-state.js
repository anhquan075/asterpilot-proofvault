const { ethers } = require("hardhat");

async function main() {
  const engineAddr = "0xE232478617E6c998be3d306B48a3661D80C5ba43";
  const vaultAddr = "0x0Bb17DbBF19Db46bA29e322675B5bc39e861C5a1";

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const engine = await ethers.getContractAt("StrategyEngine", engineAddr);
  const vault = await ethers.getContractAt("ProofVault", vaultAddr);

  console.log("\n--- Engine State ---");
  const cycleCount = await engine.cycleCount();
  const lastExecution = await engine.lastExecution();
  const lastPrice = await engine.lastPrice();
  const canExec = await engine.canExecute();
  const timeUntil = await engine.timeUntilNextCycle();

  console.log("Cycle Count:", cycleCount.toString());
  console.log(
    "Last Execution:",
    new Date(Number(lastExecution) * 1000).toISOString()
  );
  console.log("Last Price:", lastPrice.toString());
  console.log("Time Until Next Cycle:", timeUntil.toString(), "s");
  console.log(
    "Can Execute:",
    canExec[0],
    ethers.decodeBytes32String(canExec[1])
  );

  const preview = await engine.previewDecision();
  console.log("\n--- Decision Preview ---");
  console.log("Executable:", preview.executable);
  console.log("Reason:", ethers.decodeBytes32String(preview.reason));
  console.log("Target Aster Bps:", preview.targetAsterBps.toString());
  console.log("Target LP Bps:", preview.targetLpBps.toString());
  console.log("Bounty Bps:", preview.bountyBps.toString());
  console.log("Breaker Paused:", preview.breakerPaused);

  console.log("\n--- Vault State ---");
  const totalAssets = await vault.totalAssets();
  const bufferStatus = await vault.bufferStatus();
  console.log("Total Assets:", ethers.formatUnits(totalAssets, 18), "USDT");
  console.log("Buffer Target:", ethers.formatUnits(bufferStatus[0], 18));
  console.log("Buffer Current:", ethers.formatUnits(bufferStatus[1], 18));
  console.log("Buffer Utilization:", bufferStatus[2].toString(), "bps");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
