const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const addressesPath = path.join(__dirname, "../frontend/lib/polkadotHubAddresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8")).contracts;

    console.log("Checking Managed Assets on Polkadot Hub...");

    const entities = [
        { name: "MoonwellERC4626Adapter", addr: addresses.moonwellERC4626Adapter },
        { name: "MoonwellLendingAdapter", addr: addresses.moonwellLendingAdapter },
        { name: "BeamSwapFarmAdapter", addr: addresses.beamSwapFarmAdapter }
    ];

    for (const entity of entities) {
        const adapter = await ethers.getContractAt("contracts/interfaces/IManagedAdapter.sol:IManagedAdapter", entity.addr);
        const assets = await adapter.managedAssets();
        console.log(`${entity.name} (${entity.addr}): ${ethers.formatUnits(assets, 6)} USDC`);
    }
}

main().catch(console.error);
