const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://bsc-mainnet.public.blastapi.io");
    const masterChefAddr = "0x556B9306565093C855AEA9AE92A594704c2Cd59e";
    const targetLP = "0x176f274335c8B5fD5Ec5e8274d0cf36b08E44A57";

    const chef = new ethers.Contract(masterChefAddr, [
        "function poolLength() view returns (uint256)",
        "function lpToken(uint256) view returns (address)"
    ], provider);

    try {
        const length = await chef.poolLength();
        console.log(`Searching through ${length} pools...`);
        
        // Search from 0 up to length
        for (let i = 0; i < Number(length); i++) {
            try {
                const lp = await chef.lpToken(i);
                if (lp.toLowerCase() === targetLP.toLowerCase()) {
                    console.log(`✅ FOUND! Pool ID for ${targetLP} is ${i}`);
                    return;
                }
                if (i % 50 === 0) console.log(`Checked ${i} pools...`);
            } catch (e) {
                // skip
            }
        }
        console.log("❌ Pool not found.");
    } catch (error) {
        console.error("Search failed:", error.message);
    }
}
main();
