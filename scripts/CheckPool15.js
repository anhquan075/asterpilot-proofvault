const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://bsc-mainnet.public.blastapi.io");
    const masterChefAddr = "0x556B9306565093C855AEA9AE92A594704c2Cd59e";
    const poolId = 15;

    const chef = new ethers.Contract(masterChefAddr, [
        "function lpToken(uint256) view returns (address)",
        "function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accCakePerShare)"
    ], provider);

    try {
        const lp = await chef.lpToken(poolId);
        console.log(`Pool ${poolId} LP Token: ${lp}`);
        const info = await chef.poolInfo(poolId);
        console.log(`Alloc Point: ${info.allocPoint}`);
    } catch (error) {
        console.error("Pool 15 probe failed:", error.message);
    }
}
main();
