const { ethers } = require("hardhat");

async function main() {
  const breakerAddr = "0x4F5A035B55991AC51DE652E5f342fE0551711C3c";
  const breaker = await ethers.getContractAt("CircuitBreaker", breakerAddr);

  const status = await breaker.previewBreaker();
  console.log("--- Circuit Breaker Status (Testnet) ---");
  console.log("Paused:", status.paused);
  console.log("Signal A (Chainlink Deviation):", status.signalA);
  console.log("Signal B (Reserve Deviation):", status.signalB);
  console.log("Signal C (Virtual Price Drop):", status.signalC);
  console.log("Last Trip Timestamp:", status.lastTripTimestamp.toString());

  const now = Math.floor(Date.now() / 1000);
  if (status.paused) {
    const recovery = Number(status.recoveryTimestamp);
    if (now >= recovery) {
      console.log(
        "✅ Cooldown has elapsed. Contract can be recovered by calling checkBreaker()."
      );
    } else {
      console.log(`⌛ Recovery possible in ${recovery - now}s`);
    }
  }
}

main().catch(console.error);
