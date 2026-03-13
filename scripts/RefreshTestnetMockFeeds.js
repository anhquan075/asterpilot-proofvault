/**
 * RefreshTestnetMockFeeds.js
 *
 * Refreshes the MockChainlinkAggregator feed timestamp so the CircuitBreaker's
 * Signal A clears (stale-feed trip), then calls checkBreaker() to auto-recover.
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Signer:", deployer.address);

  // Network specific breaker addresses
  let circuitBreakerAddr;
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  if (chainId === 97n) {
    circuitBreakerAddr = "0xfB5D6f83b1a5c42dFCd3fFAF76d0eF0d5ae5cB66";
  } else if (chainId === 102031n) {
    circuitBreakerAddr = "0x6b8776492e529fe1e33Df0Af42ffb7430F34660e";
  } else if (chainId === 420420417n) {
    circuitBreakerAddr = "0x42127f801ff5137ceC8b78573bADc3FCB1Bb10bf";
  } else {
    throw new Error("Unsupported network for auto-refresh");
  }

  const breaker = await ethers.getContractAt("CircuitBreaker", circuitBreakerAddr);
  const feedAddr = await breaker.chainlinkFeed();
  const feed = await ethers.getContractAt("MockChainlinkAggregator", feedAddr);

  console.log(`\n── CircuitBreaker: ${circuitBreakerAddr} ──`);
  const status = await breaker.previewBreaker();
  console.log("  paused:    ", status.paused);
  console.log("  signalA:   ", status.signalA, "(Price/Stale)");

  console.log(`\n── Refreshing Feed: ${feedAddr} ──`);
  const currentPrice = (await feed.latestRoundData())[1];
  const tx = await feed.setRound(currentPrice, Math.floor(Date.now() / 1000));
  await tx.wait();
  console.log("  Feed timestamp updated.");

  console.log("\n── Triggering checkBreaker() ──");
  await (await breaker.checkBreaker()).wait();
  
  const finalStatus = await breaker.previewBreaker();
  console.log("  paused after check:", finalStatus.paused);
  console.log("  signalA after check:", finalStatus.signalA);
  
  if (!finalStatus.signalA) {
    console.log("\n✅ Signal A cleared!");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
