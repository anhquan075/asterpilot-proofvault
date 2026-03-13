/**
 * SeedTestnetVaultDeposit.js
 *
 * Deposits mock USDT/USDC into the ProofVault to ensure StrategyEngine 
 * has deployable assets for executeCycle testing.
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  let vaultAddr, tokenAddr, decimals;
  
  if (chainId === 97n) {
    vaultAddr = "0xA7207caCEA25b8a9BFf289C8aCCcD257C862314D";
    tokenAddr = "0x74bda872E528c58D66d5DBd9Bb9072b06d99f510";
    decimals = 18;
  } else if (chainId === 102031n) {
    vaultAddr = "0x7c30B24B91Cd9923d565239fA517F3C06371E196";
    tokenAddr = "0xaB4F67AfCb9B9C390049705022A0237E81465C00";
    decimals = 18;
  } else if (chainId === 420420417n) {
    vaultAddr = "0x071958E16A54E3a963d17FdeEf2e6938CB8fbB10";
    tokenAddr = "0x3cCcB5E20193affc9E4C1C1aa5Aee425F0FfB049";
    decimals = 6;
  } else {
    throw new Error("Unsupported network");
  }

  const vault = await ethers.getContractAt("ProofVault", vaultAddr);
  const token = await ethers.getContractAt("MockERC20", tokenAddr);

  console.log(`\n── Seeding Vault: ${vaultAddr} ──`);
  const amount = ethers.parseUnits("100", decimals);
  
  console.log(`  Minting ${ethers.formatUnits(amount, decimals)} tokens...`);
  await (await token.mint(deployer.address, amount)).wait();
  
  console.log("  Approving vault...");
  await (await token.approve(vaultAddr, amount)).wait();
  
  console.log("  Depositing...");
  const tx = await vault.deposit(amount, deployer.address);
  await tx.wait();
  
  const total = await vault.totalAssets();
  console.log(`\n✅ Vault seeded! Total Assets: ${ethers.formatUnits(total, decimals)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
