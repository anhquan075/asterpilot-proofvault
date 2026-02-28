const { ethers } = require("hardhat");

async function main() {
  console.log("🧹 Clearing stale auction round on testnet...");
  const auctionAddr = "0x1E997a52FEd011C74d5a8579a74DEf1BaC035fcD";
  const auction = await ethers.getContractAt("ExecutionAuction", auctionAddr);

  const phase = await auction.phase();
  const phaseNum = Number(phase);
  console.log(
    `Current Phase: ${
      ["NotOpen", "BidPhase", "ExecutePhase", "FallbackPhase"][phaseNum]
    } (${phaseNum})`
  );

  if (phaseNum === 3) {
    console.log("Executing fallbackExecute()...");
    const tx = await auction.fallbackExecute();
    await tx.wait();
    console.log(`✅ Stale round cleared: ${tx.hash}`);
  } else {
    console.log("ℹ️ Auction not in FallbackPhase. No action needed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
