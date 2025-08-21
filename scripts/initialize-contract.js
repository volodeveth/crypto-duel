const { ethers } = require('hardhat');

async function main() {
  console.log('🔧 Initializing GameHub V2 contract...');
  
  const contractAddress = '0xad82ce9aA3c98E0b72B90abc8F6aB15F795E12b6';
  
  // Get contract ABI from artifacts
  const GameHubV2 = await ethers.getContractFactory('GameHubV2');
  
  // Connect to the deployed contract
  const gameHub = GameHubV2.attach(contractAddress);
  
  console.log(`📍 Contract address: ${contractAddress}`);
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  try {
    // Call initialize function
    console.log('🚀 Calling initialize()...');
    const tx = await gameHub.initialize();
    console.log(`📝 Transaction hash: ${tx.hash}`);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
    
    // Verify initialization
    console.log('🔍 Verifying initialization...');
    const owner = await gameHub.owner();
    const totalDuels = await gameHub.totalDuels();
    const nextDuelId = await gameHub.nextDuelId();
    
    console.log(`👑 Owner: ${owner}`);
    console.log(`🎯 Total Duels: ${totalDuels}`);
    console.log(`🆔 Next Duel ID: ${nextDuelId}`);
    
    console.log('🎉 Contract successfully initialized!');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    
    // Try to check if already initialized
    try {
      const owner = await gameHub.owner();
      console.log(`ℹ️ Contract might already be initialized. Owner: ${owner}`);
    } catch (e) {
      console.error('❌ Contract is not responding at all:', e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });