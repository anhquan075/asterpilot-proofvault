const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const addressesPath = path.join(__dirname, "../frontend/lib/polkadotHubAddresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8")).contracts;

    console.log("Checking Balances on Polkadot Hub...");

    const usdc = await ethers.getContractAt("IERC20", addresses.usdc);
    const glint = await ethers.getContractAt("IERC20", addresses.glint);

    const entities = [
        { name: "Vault", addr: addresses.vault },
        { name: "StrategyEngine", addr: addresses.strategyEngine },
        { name: "MoonwellERC4626Adapter", addr: addresses.moonwellERC4626Adapter },
        { name: "MoonwellLendingAdapter", addr: addresses.moonwellLendingAdapter },
        { name: "BeamSwapFarmAdapter", addr: addresses.beamSwapFarmAdapter },
        { name: "MockRouter", addr: addresses.router },
        { name: "MockStableSwap", addr: addresses.stableSwap },
        { name: "MockMasterChef", addr: addresses.masterChef },
        { name: "MockMoonwellVault", addr: addresses.moonwellVault },
        { name: "MockMToken", addr: addresses.mToken }
    ];

    for (const entity of entities) {
        const usdcBal = await usdc.balanceOf(entity.addr);
        const glintBal = await glint.balanceOf(entity.addr);
        console.log(`\n${entity.name} (${entity.addr}):`);
        console.log(`  USDC:  ${ethers.formatUnits(usdcBal, 6)}`);
        console.log(`  GLINT: ${ethers.formatUnits(glintBal, 18)}`);
    }
}

main().catch(console.error);
