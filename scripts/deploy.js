const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying DuelGame contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const DuelGame = await ethers.getContractFactory("DuelGame");
  const duelGame = await DuelGame.deploy();

  await duelGame.waitForDeployment();

  const contractAddress = await duelGame.getAddress();
  console.log("DuelGame deployed to:", contractAddress);
  console.log("Transaction hash:", duelGame.deploymentTransaction().hash);

  // Verify contract if on testnet/mainnet
  if (network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await duelGame.deploymentTransaction().wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("Verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });