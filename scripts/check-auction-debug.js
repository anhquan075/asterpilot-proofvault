const { ethers } = require("hardhat");

async function main() {
  const auctionAddr = "0x1E997a52FEd011C74d5a8579a74DEf1BaC035fcD";
  const auction = await ethers.getContractAt("ExecutionAuction", auctionAddr);

  const round = await auction.round();
  const phase = await auction.phase();
  const bidWindow = await auction.bidWindow();
  const executeWindow = await auction.executeWindow();
  const timestamp = (await ethers.provider.getBlock("latest")).timestamp;

  console.log("--- Auction State ---");
  console.log("Round ID:", round.id.toString());
  console.log("Opened At:", round.openedAt.toString());
  console.log("Winner:", round.winner);
  console.log("Winning Bid:", ethers.formatUnits(round.winningBid, 18), "USDT");
  console.log("Closed:", round.closed);
  console.log(
    "Current Phase:",
    ["NotOpen", "BidPhase", "ExecutePhase", "FallbackPhase"][phase]
  );
  console.log("Current Timestamp:", timestamp);
  console.log("Bid Window:", bidWindow.toString());
  console.log("Execute Window:", executeWindow.toString());

  if (round.openedAt > 0n) {
    const elapsed = BigInt(timestamp) - round.openedAt;
    console.log("Elapsed since opened:", elapsed.toString(), "s");
  }
}

main().catch(console.error);
