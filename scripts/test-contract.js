const { ethers } = require('hardhat');

async function main() {
  const contractAddress = '0xad82ce9aA3c98E0b72B90abc8F6aB15F795E12b6';
  
  console.log('Testing GameHub V2 at:', contractAddress);
  
  const GameHubV2 = await ethers.getContractFactory('GameHubV2');
  const gameHub = GameHubV2.attach(contractAddress);
  
  try {
    // Test basic functions
    const totalDuels = await gameHub.totalDuels();
    const totalBR = await gameHub.totalBattleRoyales();
    const allowedBets = await gameHub.getAllowedBets();
    const owner = await gameHub.owner();
    
    console.log('✅ Contract is working!');
    console.log('Total duels:', totalDuels.toString());
    console.log('Total Battle Royales:', totalBR.toString());
    console.log('Allowed bets count:', allowedBets.length);
    console.log('Owner:', owner);
    
    // Test waiting counts
    for (let mode = 0; mode <= 3; mode++) {
      const count = await gameHub.getWaitingPlayersCount(mode, allowedBets[0]);
      console.log(`Mode ${mode} waiting players:`, count.toString());
    }
    
    console.log('\n🎯 NEW CONTRACT ADDRESS: 0xad82ce9aA3c98E0b72B90abc8F6aB15F795E12b6');
    
  } catch (error) {
    console.error('❌ Contract test failed:', error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});