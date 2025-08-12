# Crypto Duel - Farcaster Mini App

A decentralized dueling game built for Farcaster using Next.js and Ethereum smart contracts on Base.

## Features

- **Fair Dueling System**: Provably fair randomness using blockchain entropy
- **Multiple Bet Amounts**: Choose from 0.00001 ETH to 0.01 ETH
- **Real-time Matching**: Automatic opponent matching system
- **Player Stats**: Track games, wins, and total earnings
- **Mobile Optimized**: Designed for Farcaster mobile experience

## Tech Stack

- **Frontend**: Next.js + React + Tailwind CSS
- **Blockchain**: Ethereum (Base Network)
- **Smart Contract**: Solidity with fair randomness
- **Wallet Integration**: ethers.js for Web3 connectivity

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   - Copy `.env.local` and update with your values
   - Set `NEXT_PUBLIC_BASE_URL` to your deployment URL
   - Set `NEXT_PUBLIC_CONTRACT_ADDRESS` after deployment

3. **Deploy Smart Contract**:
   ```bash
   npm run compile
   npm run deploy:testnet  # For Base Sepolia
   # OR
   npm run deploy:mainnet  # For Base mainnet
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Deploy to Vercel**:
   ```bash
   npm run build
   vercel --prod
   ```

## Smart Contract Features

- **Multiple Bet Tiers**: 0.00001, 0.0001, 0.001, 0.01 ETH
- **Owner Fee**: 10% from each bet (20% total from winnings)
- **Fair Randomness**: Uses block.prevrandao + multiple entropy sources
- **Automatic Matching**: Players matched by bet amount
- **Emergency Functions**: Cancel waiting, emergency withdraw

## Game Flow

1. Player selects bet amount and joins queue
2. System matches with opponent of same bet amount
3. Smart contract generates provably fair random result
4. Winner receives 1.8x their bet (90% of total pool)
5. 10% fee goes to contract owner

## Deployment Instructions

### Smart Contract Deployment
```bash
# Set your private key in .env.local
PRIVATE_KEY=your_private_key_here

# Deploy to Base Sepolia (testnet)
npm run deploy:testnet

# Copy the contract address to .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel with token
vercel --token Th2l3lmyEHJpCpDZTYjFZ2UY

# Or deploy manually
vercel
```

### Farcaster Integration
1. Deploy frontend to get your domain
2. Update `.env.local` with your domain
3. Go to Farcaster Developer Settings
4. Enable Developer Mode
5. Add your domain
6. Test the mini app

## File Structure

```
├── contracts/          # Solidity smart contracts
├── pages/              # Next.js pages
│   ├── api/           # API routes
│   ├── index.js       # Landing page
│   └── app.js         # Main game interface
├── styles/            # CSS styles
├── scripts/           # Deployment scripts
├── public/            # Static assets
└── hardhat.config.js  # Hardhat configuration
```

## Security Features

- **Provably Fair**: All randomness verifiable on-chain
- **No Reentrancy**: Proper state management
- **Input Validation**: All bets validated against allowed amounts
- **Emergency Stops**: Owner can pause in emergencies

## License

MIT License