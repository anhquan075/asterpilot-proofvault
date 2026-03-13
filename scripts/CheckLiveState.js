const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const network = hre.network.name;
    console.log(`Checking Live State for ${network}...`);

    let vaultAddr;
    let decimals = 18;

    if (network === "polkadotHubTestnet") {
        const addressesPath = path.join(__dirname, "../frontend/lib/polkadotHubAddresses.json");
        const addrs = JSON.parse(fs.readFileSync(addressesPath, "utf8")).contracts;
        vaultAddr = addrs.vault;
        decimals = 6;
    } else if (network === "creditcoinTestnet") {
        const contractAddresses = require("../frontend/lib/ContractAddresses");
        vaultAddr = contractAddresses.V2_CREDITCOIN_TESTNET_PRESET.vaultAddress;
        decimals = 18;
    } else {
        console.error("Unsupported network for this script.");
        process.exit(1);
    }

    const vault = await ethers.getContractAt("ProofVault", vaultAddr);
    const asterAddr = await vault.asterAdapter();
    const lpAddr = await vault.lpAdapter();
    const secAddr = await vault.secondaryAdapter();

    console.log(`Vault: ${vaultAddr}`);
    console.log(`- Aster Rail:     ${asterAddr}`);
    console.log(`- LP Rail:        ${lpAddr}`);
    console.log(`- Secondary Rail: ${secAddr}`);

    const totalAssets = await vault.totalAssets();
    console.log(`\nTotal Assets: ${ethers.formatUnits(totalAssets, decimals)}`);

    if (asterAddr !== ethers.ZeroAddress) {
        const adapter = await ethers.getContractAt("contracts/interfaces/IManagedAdapter.sol:IManagedAdapter", asterAddr);
        const bal = await adapter.managedAssets();
        console.log(`Rail 1 Managed: ${ethers.formatUnits(bal, decimals)}`);
    }
    if (lpAddr !== ethers.ZeroAddress) {
        const adapter = await ethers.getContractAt("contracts/interfaces/IManagedAdapter.sol:IManagedAdapter", lpAddr);
        const bal = await adapter.managedAssets();
        console.log(`Rail 2 Managed: ${ethers.formatUnits(bal, decimals)}`);
    }
    if (secAddr !== ethers.ZeroAddress) {
        const adapter = await ethers.getContractAt("contracts/interfaces/IManagedAdapter.sol:IManagedAdapter", secAddr);
        const bal = await adapter.managedAssets();
        console.log(`Rail 3 Managed: ${ethers.formatUnits(bal, decimals)}`);
    }
}

main().catch(console.error);
