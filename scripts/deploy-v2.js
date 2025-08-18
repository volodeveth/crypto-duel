const { ethers, upgrades } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying GameHub V2 with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy the upgradeable GameHub V2
  console.log('Deploying GameHub V2...');
  const GameHubV2 = await ethers.getContractFactory('GameHubV2');
  
  const gameHub = await upgrades.deployProxy(GameHubV2, [], {
    initializer: 'initialize',
    kind: 'uups'
  });

  await gameHub.waitForDeployment();

  const proxyAddress = await gameHub.getAddress();
  console.log('GameHub V2 Proxy deployed to:', proxyAddress);
  
  // Skip implementation address check for now
  console.log('Implementation address check skipped due to proxy detection issue');

  // Verify the proxy is working
  console.log('Verifying deployment...');
  const totalDuels = await gameHub.totalDuels();
  const allowedBets = await gameHub.getAllowedBets();
  
  console.log('Total duels:', totalDuels.toString());
  console.log('Allowed bets count:', allowedBets.length);
  console.log('Owner:', await gameHub.owner());

  console.log('\n✅ GameHub V2 deployment completed!');
  console.log('🔄 Proxy Address (use this in frontend):', proxyAddress);
  
  return {
    proxy: proxyAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });