const { ethers } = require("hardhat");
const contractAddresses = require("../frontend/lib/contractAddresses");

async function main() {
    const [deployer] = await ethers.getSigners();
    const vaultAddr = contractAddresses.V2_MAINNET_PRESET.vaultAddress;
    
    console.log(`Withdrawing from vault: ${vaultAddr}`);
    const vault = await ethers.getContractAt("ProofVault", vaultAddr);

    try {
        const shares = await vault.balanceOf(deployer.address);
        if (shares === 0n) {
            console.log("No shares to withdraw.");
            return;
        }

        const assets = await vault.convertToAssets(shares);
        console.log(`Attempting to withdraw ${ethers.formatUnits(assets, 18)} USDT...`);

        const tx = await vault.withdraw(assets, deployer.address, deployer.address);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Withdrawal successful!");

    } catch (error) {
        console.error("Withdrawal failed:", error.message);
    }
}
main();
