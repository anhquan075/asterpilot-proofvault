const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Seeding Mock Router Reserves on Polkadot Hub with account:", deployer.address);

    const addressesPath = path.join(__dirname, "../frontend/lib/polkadotHubAddresses.json");
    if (!fs.existsSync(addressesPath)) {
        console.error("No addresses found. Run a deployment first.");
        process.exit(1);
    }
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8")).contracts;

    const router = await ethers.getContractAt("MockPancakeRouter", addresses.router);
    const masterChef = await ethers.getContractAt("MockMasterChef", addresses.masterChef);
    const usdc = await ethers.getContractAt("MockUSDC", addresses.usdc);
    const glint = await ethers.getContractAt("MockGLINTToken", addresses.glint);

    const SEED_AMOUNT_USDC = ethers.parseUnits("1000000", 6); // 1M USDC
    const SEED_AMOUNT_GLINT = ethers.parseUnits("1000000", 18); // 1M GLINT

    console.log("\n--- Minting to Router ---");
    console.log(`Minting ${ethers.formatUnits(SEED_AMOUNT_USDC, 6)} USDC to router...`);
    await (await usdc.mint(addresses.router, SEED_AMOUNT_USDC)).wait();
    
    console.log(`Minting ${ethers.formatUnits(SEED_AMOUNT_GLINT, 18)} GLINT to router...`);
    await (await glint.mint(addresses.router, SEED_AMOUNT_GLINT)).wait();

    console.log("\n--- Minting to MasterChef ---");
    console.log(`Minting ${ethers.formatUnits(SEED_AMOUNT_GLINT, 18)} GLINT to MasterChef...`);
    await (await glint.mint(addresses.masterChef, SEED_AMOUNT_GLINT)).wait();

    console.log("\n--- Setting Reserves ---");
    // Standard 1:1 ratio for mock purposes
    await (await router.setReserves(addresses.usdc, addresses.glint, SEED_AMOUNT_USDC, SEED_AMOUNT_GLINT)).wait();
    console.log("Reserves set successfully!");

    console.log("\nVerification Complete! ✅ Mock Router is ready for swaps.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
