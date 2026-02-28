const { ethers } = require("hardhat");
const contractAddresses = require("../frontend/lib/contractAddresses");

async function main() {
    const [deployer] = await ethers.getSigners();
    const vaultAddr = contractAddresses.V2_MAINNET_PRESET.vaultAddress;
    
    console.log(`Using account: ${deployer.address}`);
    console.log(`Vault Address: ${vaultAddr}`);

    const vault = await ethers.getContractAt("ProofVault", vaultAddr);

    try {
        const shares = await vault.balanceOf(deployer.address);
        const assets = await vault.convertToAssets(shares);
        const maxW = await vault.maxWithdraw(deployer.address);
        const total = await vault.totalAssets();

        console.log(`--- Previous Vault Probe ---`);
        console.log(`Deployer Shares: ${shares.toString()}`);
        console.log(`Deployer Assets: ${ethers.formatUnits(assets, 18)} USDT`);
        console.log(`Max Withdrawable: ${ethers.formatUnits(maxW, 18)} USDT`);
        console.log(`Vault Total Assets: ${ethers.formatUnits(total, 18)} USDT`);

    } catch (error) {
        console.error("Probe failed:", error.message);
    }
}
main();
