const { ethers, network } = require("hardhat");

async function main() {
  if (network.name !== "hardhat") {
    console.error(
      "This script must be run on the Hardhat network with mainnet forking enabled."
    );
    return;
  }

  console.log("🔍 Probing Mainnet AsterMinter...");
  const MINTER = "0xdB57a53C428a9faFcbFefFB6dd80d0f427543695";
  const USER = "0xB789D888A53D34f6701C1A5876101Cb32dbF17cF"; // Random addr for view calls

  const minter = await ethers.getContractAt(
    [
      "function managedAssets(address) view returns (uint256)",
      "function getWithdrawRequest(uint256) view returns (uint256, uint256, bool)",
      "function deposit(uint256) external returns (bool)",
      "function requestWithdraw(uint256) external returns (uint256)",
    ],
    MINTER
  );

  try {
    const assets = await minter.managedAssets(USER);
    console.log("managedAssets(USER) success:", assets.toString());
  } catch (e) {
    console.log("managedAssets(USER) failed:", e.message);
  }

  // Check if we can find the correct selector for managedAssets if it's not 0xad1728cb
  console.log("Checking 0xad1728cb...");
  try {
    const data = await network.provider.send("eth_call", [
      {
        to: MINTER,
        data: "0xad1728cb" + USER.slice(2).padStart(64, "0"),
      },
    ]);
    console.log("Selector 0xad1728cb result:", data);
  } catch (e) {
    console.log("Selector 0xad1728cb failed");
  }
}

main().catch(console.error);
