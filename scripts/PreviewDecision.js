const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const addressesPath = path.join(__dirname, "../frontend/lib/polkadotHubAddresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8")).contracts;

    const engine = await ethers.getContractAt("StrategyEngine", addresses.strategyEngine);

    console.log("Previewing Decision on Polkadot Hub...");
    const preview = await engine.previewDecision();
    
    console.log(`\nDecision:`);
    console.log(`  Executable:      ${preview.executable}`);
    console.log(`  Reason:          ${ethers.decodeBytes32String(preview.reason)}`);
    console.log(`  Next State:      ${preview.nextState}`);
    console.log(`  Bounty Bps:      ${preview.bountyBps}`);
    console.log(`  Target Aster:    ${preview.targetAsterBps}`);
    console.log(`  Target LP:       ${preview.targetLpBps}`);
    console.log(`  Breaker Paused:  ${preview.breakerPaused}`);
    console.log(`  Price:           ${ethers.formatUnits(preview.price, 8)}`);
}

main().catch(console.error);
