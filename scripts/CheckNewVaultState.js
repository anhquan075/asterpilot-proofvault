const { ethers } = require("hardhat");
const contractAddresses = require("../frontend/lib/contractAddresses");

async function main() {
    const vaultAddr = contractAddresses.V2_MAINNET_PRESET.vaultAddress;
    const vault = await ethers.getContractAt("ProofVault", vaultAddr);

    try {
        const venusVToken = await vault.venusVToken();
        const venusScale = await vault.venusExchangeRateScale();
        console.log("Venus VToken:", venusVToken);
        console.log("Venus Scale:", venusScale.toString());
        
        const aster = await vault.asterAdapter();
        const secondary = await vault.secondaryAdapter();
        const lp = await vault.lpAdapter();
        console.log("Aster Adapter:", aster);
        console.log("Secondary Adapter:", secondary);
        console.log("LP Adapter:", lp);
        
        const engine = await vault.engine();
        console.log("Engine:", engine);

    } catch (error) {
        console.error("Failed to query vault:", error.message);
    }
}
main();
