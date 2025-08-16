require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });
const fs = require('fs');

// Read private key from file first, then fallback to env
let privateKey;
if (fs.existsSync('./new-private-key.txt')) {
  privateKey = fs.readFileSync('./new-private-key.txt', 'utf8').trim();
  console.log('Using private key from file');
} else {
  privateKey = process.env.PRIVATE_KEY;
  console.log('Using private key from environment');
}

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    base: {
      url: "https://mainnet.base.org",
      accounts: privateKey ? [privateKey] : [],
      chainId: 8453,
      gasPrice: 20000000, // 0.02 gwei 
      gas: 1040000
    },
    baseSepolia: {
      url: "https://sepolia.base.org", 
      accounts: privateKey ? [privateKey] : [],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei
      gas: 3000000
    }
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || "",
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  }
};