const { ethers } = require("hardhat");
const contractAddresses = require("../frontend/lib/contractAddresses");

async function main() {
    console.log("Fixing Testnet Pool Balance to reset Circuit Breaker...");
    const V2_TESTNET = contractAddresses.V2_TESTNET_PRESET;
    
    const breaker = await ethers.getContractAt("CircuitBreaker", V2_TESTNET.circuitBreakerAddress);
    const poolAddr = await breaker.stableSwapPool();
    
    // Mock USDF address for testnet
    const usdfAddr = "0x8E8A375f10543e5c9842f50B62C5BCE37E28e952";
    const usdf = await ethers.getContractAt("MockERC20", usdfAddr);
    
    const abi = ["function get_balances() view returns (uint256[2])"];
    const pool = new ethers.Contract(poolAddr, abi, ethers.provider);
    
    const bals = await pool.get_balances();
    const bal0 = bals[0]; // USDF
    const bal1 = bals[1]; // USDT
    
    const diff = bal1 - bal0;
    if (diff > 0n) {
        console.log(`Pool needs ${ethers.formatUnits(diff, 18)} USDF to reach 1:1 parity.`);
        try {
            const tx = await usdf.mint(poolAddr, diff);
            await tx.wait();
            console.log("✅ Minted missing USDF to pool!");
        } catch (e) {
            console.log("Failed to mint USDF:", e.message);
        }
    } else if (diff < 0n) {
        console.log(`Pool needs ${ethers.formatUnits(-diff, 18)} USDT to reach 1:1 parity.`);
        try {
            const usdt = await ethers.getContractAt("MockERC20", V2_TESTNET.tokenAddress);
            const tx = await usdt.mint(poolAddr, -diff);
            await tx.wait();
            console.log("✅ Minted missing USDT to pool!");
        } catch (e) {
            console.log("Failed to mint USDT:", e.message);
        }
    } else {
        console.log("✅ Pool is already balanced.");
    }
    
    const newBals = await pool.get_balances();
    console.log(`New Balances - USDF: ${ethers.formatUnits(newBals[0], 18)}, USDT: ${ethers.formatUnits(newBals[1], 18)}`);
    
    const status = await breaker.previewBreaker();
    console.log(`Breaker Status: Paused=${status.paused}, SigA=${status.signalA}, SigB=${status.signalB}, SigC=${status.signalC}`);
    
    if (status.paused) {
        const block = await ethers.provider.getBlock('latest');
        const now = BigInt(block.timestamp);
        if (now < status.recoveryTimestamp) {
            console.log(`⚠️ Breaker is paused. Cooldown expires in ${status.recoveryTimestamp - now} seconds.`);
        } else {
            console.log("Running checkBreaker to clear paused state...");
            await (await breaker.checkBreaker()).wait();
            const newStatus = await breaker.isPaused();
            console.log(`✅ Breaker unpaused! Current state: ${newStatus}`);
        }
    }
}
main().catch(console.error);
