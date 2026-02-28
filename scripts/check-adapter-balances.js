const { ethers } = require("hardhat");

async function main() {
  const vaultAddr = "0xA7207caCEA25b8a9BFf289C8aCCcD257C862314D";
  const [signer] = await ethers.getSigners();

  const vault = await ethers.getContractAt("ProofVault", vaultAddr);

  const asterAddr = await vault.asterAdapter();
  const secondaryAddr = await vault.secondaryAdapter();
  const lpAddr = await vault.lpAdapter();

  console.log("Aster Adapter:", asterAddr);
  console.log("Secondary Adapter:", secondaryAddr);
  console.log("LP Adapter:", lpAddr);

  const aster = await ethers.getContractAt("IAsterEarnAdapter", asterAddr);
  const secondary = await ethers.getContractAt(
    "contracts/interfaces/IManagedAdapter.sol:IManagedAdapter",
    secondaryAddr
  );

  const asterManaged = await aster.managedAssets();
  const secondaryManaged = await secondary.managedAssets();

  console.log("\n--- Managed Assets ---");
  console.log("Aster Managed:", ethers.formatUnits(asterManaged, 18), "USDT");
  console.log(
    "Secondary Managed:",
    ethers.formatUnits(secondaryManaged, 18),
    "USDT"
  );

  if (lpAddr !== ethers.ZeroAddress) {
    const lp = await ethers.getContractAt(
      "contracts/interfaces/IManagedAdapter.sol:IManagedAdapter",
      lpAddr
    );
    const lpManaged = await lp.managedAssets();
    console.log("LP Managed:", ethers.formatUnits(lpManaged, 18), "USDT");
  } else {
    console.log("LP Managed: N/A");
  }

  const idle = await vault.totalAssets();
  console.log("Total Vault Assets:", ethers.formatUnits(idle, 18), "USDT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
