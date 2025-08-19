import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Target, HandCoins, Clock, Dice6, Trophy, DollarSign, Shield, Eye, CheckCircle, Smartphone, TrendingUp, Users, BarChart3, Bell, Info, HelpCircle, Zap } from 'lucide-react';

export default function HowItWorks() {
  const baseUrl = 'https://cryptoduel.xyz';

  return (
    <>
      <Head>
        <title>How Crypto Duel Works - Complete Guide</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Learn how Crypto Duel works - a blockchain-based betting game with 50/50 odds, provably fair results, and instant ETH payouts." />
        <meta property="og:title" content="How Crypto Duel Works - Complete Guide" />
        <meta property="og:description" content="Learn how to play Crypto Duel - fair 1v1 ETH battles on blockchain with instant payouts" />
        <meta property="og:image" content={`${baseUrl}/image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${baseUrl}/image.png`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto p-4">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img src="/icon2.png" alt="Crypto Duel" className="w-16 h-16 mx-auto mb-3" />
              <Link href="/app" className="inline-flex items-center gap-2 text-purple-200 hover:text-purple-100 text-sm mb-4">
                <ArrowLeft size={16} /> Back to Game
              </Link>
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              How Crypto Duel Works
            </h1>
            <p className="text-gray-300 text-lg">Complete guide to fair blockchain dueling</p>
          </div>

          {/* What is Crypto Duel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-400/20 rounded-xl">
                <Target size={24} className="text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                What is Crypto Duel?
              </h2>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Crypto Duel is a blockchain-based betting game where players compete in multiple game modes using real ETH on Base network. 
              It's simple, fair, and transparent - with every outcome provably random and verifiable on-chain.
            </p>
            
            {/* Game Modes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-600/20 rounded-xl p-4 border border-blue-600/30 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-400/20 rounded-lg">
                    <Target size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-400">🎯 Duel (1v1)</h3>
                    <p className="text-xs text-gray-400">Classic head-to-head</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">Battle one opponent with <span className="text-green-400 font-semibold">1.8x multiplier</span></p>
              </div>
              
              <div className="bg-green-600/20 rounded-xl p-4 border border-green-600/30 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-400/20 rounded-lg">
                    <Users size={20} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400">⚔️ Battle Royale 5</h3>
                    <p className="text-xs text-gray-400">Small Battle Royale</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">5-player battle with <span className="text-green-400 font-semibold">4.5x multiplier</span></p>
              </div>
              
              <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-600/30 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-400/20 rounded-lg">
                    <Trophy size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-400">👑 Battle Royale 100</h3>
                    <p className="text-xs text-gray-400">Mega battles</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">100-player mayhem with <span className="text-green-400 font-semibold">90x multiplier</span></p>
              </div>
              
              <div className="bg-orange-600/20 rounded-xl p-4 border border-orange-600/30 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-400/20 rounded-lg">
                    <Zap size={20} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-orange-400">🔥 Battle Royale 1000</h3>
                    <p className="text-xs text-gray-400">Ultimate showdown</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">1000-player chaos with <span className="text-green-400 font-semibold">900x multiplier</span></p>
              </div>
            </div>
          </div>

          {/* How It Works Steps */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              How It Works
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/10 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-400/20 rounded-lg">
                    <Target size={20} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-400">1. Choose Your Mode & Bet</h3>
                    <div className="text-xs text-gray-400">Select your game mode and risk level</div>
                  </div>
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Choose: Duel, Battle Royale 5, Battle Royale 100, or Battle Royale 1000</li>
                  <li>• Select: 0.00001, 0.0001, 0.001, or 0.01 ETH</li>
                  <li>• See waiting players and multipliers</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/10 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-400/20 rounded-lg">
                    <HandCoins size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-400">2. Confirm Your Battle</h3>
                    <div className="text-xs text-gray-400">Review before committing</div>
                  </div>
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Review bet details carefully</li>
                  <li>• Confirm with "Make Your Bet" button</li>
                  <li>• Wallet prompts for transaction approval</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/10 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-yellow-400/20 rounded-lg">
                    <Clock size={20} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-400">3. Wait for Players</h3>
                    <div className="text-xs text-gray-400">Battle fills up</div>
                  </div>
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Your bet locks in smart contract</li>
                  <li>• Wait for battle to fill (1, 5, 100, or 1000 players)</li>
                  <li>• Share game to find players faster!</li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/10 hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-400/20 rounded-lg">
                    <Dice6 size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-400">4. Fair Random Result</h3>
                    <div className="text-xs text-gray-400">Provably fair outcome</div>
                  </div>
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Smart contract generates random outcome</li>
                  <li>• Equal chance for every player to win</li>
                  <li>• Winner gets multiplier based on mode (10% platform fee)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What You Get */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              What You Get
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* When You Win */}
              <div className="bg-green-600/20 rounded-xl p-5 border border-green-600/30">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy size={24} className="text-green-400" />
                  <h3 className="text-xl font-semibold text-green-400">When You Win</h3>
                </div>
                <div className="space-y-3">
                  <div className="text-gray-300">
                    <div className="font-semibold text-blue-300 mb-1">🎯 Duel: <span className="text-green-400">1.8x multiplier</span></div>
                    <div className="text-sm ml-4">0.01 ETH → 0.018 ETH</div>
                  </div>
                  <div className="text-gray-300">
                    <div className="font-semibold text-green-300 mb-1">⚔️ Battle Royale 5: <span className="text-green-400">4.5x multiplier</span></div>
                    <div className="text-sm ml-4">0.01 ETH → 0.045 ETH</div>
                  </div>
                  <div className="text-gray-300">
                    <div className="font-semibold text-purple-300 mb-1">👑 Battle Royale 100: <span className="text-green-400">90x multiplier</span></div>
                    <div className="text-sm ml-4">0.01 ETH → 0.9 ETH</div>
                  </div>
                  <div className="text-gray-300">
                    <div className="font-semibold text-orange-300 mb-1">🔥 Battle Royale 1000: <span className="text-green-400">900x multiplier</span></div>
                    <div className="text-sm ml-4">0.01 ETH → 9 ETH</div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-green-600/30">
                    <p className="text-sm text-gray-400">All payouts are instant and automatic</p>
                  </div>
                </div>
              </div>

              {/* Track Performance */}
              <div className="bg-blue-600/20 rounded-xl p-5 border border-blue-600/30">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 size={24} className="text-blue-400" />
                  <h3 className="text-xl font-semibold text-blue-400">Track Performance</h3>
                </div>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <Users size={16} className="text-blue-400" />
                    <span>View all battles in "My Games"</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-400" />
                    <span>Track wins, losses, earnings across all modes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Trophy size={16} className="text-blue-400" />
                    <span>Climb leaderboard rankings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Eye size={16} className="text-blue-400" />
                    <span>Separate stats for Duels and Battle Royale</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security & Fairness */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Security & Fairness
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Provably Fair */}
              <div className="text-center">
                <div className="p-4 bg-green-400/20 rounded-xl mx-auto w-fit mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h3 className="font-semibold text-green-400 mb-2">Provably Fair</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>Random outcomes on-chain</li>
                  <li>Verifiable random seed</li>
                  <li>Equal probability for all players in each mode</li>
                </ul>
              </div>

              {/* Smart Contract Security */}
              <div className="text-center">
                <div className="p-4 bg-blue-400/20 rounded-xl mx-auto w-fit mb-4">
                  <Shield size={32} className="text-blue-400" />
                </div>
                <h3 className="font-semibold text-blue-400 mb-2">Smart Contract</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>Open source & verified</li>
                  <li>Secure on Base blockchain</li>
                  <li>Automatic payouts</li>
                </ul>
              </div>

              {/* Transparent */}
              <div className="text-center">
                <div className="p-4 bg-purple-400/20 rounded-xl mx-auto w-fit mb-4">
                  <Eye size={32} className="text-purple-400" />
                </div>
                <h3 className="font-semibold text-purple-400 mb-2">Transparent</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>All transactions visible</li>
                  <li>Contract code reviewable</li>
                  <li>Real-time statistics</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Getting Started
            </h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="p-3 bg-cyan-400/20 rounded-xl flex-shrink-0">
                  <Smartphone size={24} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-cyan-400 mb-2">Step 1: Connect Wallet</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Use Farcaster built-in wallet, or</li>
                    <li>• Connect MetaMask/external wallet</li>
                    <li>• Automatically switches to Base network</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="p-3 bg-green-400/20 rounded-xl flex-shrink-0">
                  <Target size={24} className="text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-400 mb-2">Step 2: Choose Strategy</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• <strong>Small bets (0.00001 ETH):</strong> Practice and have fun</li>
                    <li>• <strong>Medium bets (0.001 ETH):</strong> Balanced risk/reward</li>
                    <li>• <strong>Large bets (0.01 ETH):</strong> High stakes excitement</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="p-3 bg-yellow-400/20 rounded-xl flex-shrink-0">
                  <Shield size={24} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-400 mb-2">Step 3: Play Responsibly</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Only bet what you can afford to lose</li>
                    <li>• Remember: this is entertainment, not investment</li>
                    <li>• Take breaks and set limits for yourself</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          {/* Game Mode Details */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Game Mode Details & Odds
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/30 rounded-xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-blue-400 mb-3">🎯 Duel Mode (1v1)</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• <span className="text-green-400">50% chance to win</span> (1 in 2)</li>
                  <li>• <span className="text-yellow-400">1.8x multiplier</span> payout</li>
                  <li>• Quick battles, instant results</li>
                  <li>• Perfect for head-to-head challenges</li>
                </ul>
              </div>
              
              <div className="bg-black/30 rounded-xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-green-400 mb-3">⚔️ Battle Royale 5 Mode</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• <span className="text-green-400">20% chance to win</span> (1 in 5)</li>
                  <li>• <span className="text-yellow-400">4.5x multiplier</span> payout</li>
                  <li>• Small group Battle Royale</li>
                  <li>• Higher risk, higher reward</li>
                </ul>
              </div>
              
              <div className="bg-black/30 rounded-xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-purple-400 mb-3">👑 Battle Royale 100 Mode</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• <span className="text-green-400">1% chance to win</span> (1 in 100)</li>
                  <li>• <span className="text-yellow-400">90x multiplier</span> payout</li>
                  <li>• Massive multiplayer battles</li>
                  <li>• Huge potential winnings</li>
                </ul>
              </div>
              
              <div className="bg-black/30 rounded-xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-orange-400 mb-3">🔥 Battle Royale 1000 Mode</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• <span className="text-green-400">0.1% chance to win</span> (1 in 1000)</li>
                  <li>• <span className="text-yellow-400">900x multiplier</span> payout</li>
                  <li>• Ultimate high-stakes gambling</li>
                  <li>• Life-changing potential payouts</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 bg-yellow-600/20 rounded-xl p-4 border border-yellow-600/30">
              <p className="text-yellow-300 text-center font-medium">
                💡 <strong>Pro Tip:</strong> All games have equal expected value after the 10% platform fee. Choose based on your risk tolerance!
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Platform Features
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <Bell size={20} className="text-purple-400" />
                <div>
                  <div className="font-semibold text-purple-400">Farcaster Notifications</div>
                  <div className="text-xs text-gray-400">Get notified about results</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <DollarSign size={20} className="text-green-400" />
                <div>
                  <div className="font-semibold text-green-400">USD Display</div>
                  <div className="text-xs text-gray-400">See ETH in USD</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <Trophy size={20} className="text-yellow-400" />
                <div>
                  <div className="font-semibold text-yellow-400">Leaderboard</div>
                  <div className="text-xs text-gray-400">Compete with players</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <BarChart3 size={20} className="text-blue-400" />
                <div>
                  <div className="font-semibold text-blue-400">Analytics</div>
                  <div className="text-xs text-gray-400">Track performance</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <Users size={20} className="text-cyan-400" />
                <div>
                  <div className="font-semibold text-cyan-400">Social Sharing</div>
                  <div className="text-xs text-gray-400">Challenge friends</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <Smartphone size={20} className="text-indigo-400" />
                <div>
                  <div className="font-semibold text-indigo-400">Mobile Optimized</div>
                  <div className="text-xs text-gray-400">Play anywhere</div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              <div className="bg-black/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle size={20} className="text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">How long until I find an opponent?</h3>
                </div>
                <p className="text-gray-300 ml-8">Usually within minutes! Share the game on social media to attract more players.</p>
              </div>

              <div className="bg-black/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle size={20} className="text-green-400" />
                  <h3 className="font-semibold text-green-400">What if no one matches my bet?</h3>
                </div>
                <p className="text-gray-300 ml-8">You can cancel anytime and get full refund minus gas fees.</p>
              </div>

              <div className="bg-black/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle size={20} className="text-purple-400" />
                  <h3 className="font-semibold text-purple-400">Where do winnings go?</h3>
                </div>
                <p className="text-gray-300 ml-8">Directly to your connected wallet automatically via smart contract.</p>
              </div>

              <div className="bg-black/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle size={20} className="text-yellow-400" />
                  <h3 className="font-semibold text-yellow-400">Is this legal?</h3>
                </div>
                <p className="text-gray-300 ml-8">Gaming laws vary by jurisdiction. Play responsibly and check local regulations.</p>
              </div>
            </div>
          </div>

          {/* CTA Footer */}
          <div className="text-center py-8">
            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Ready to Duel? ⚔️
              </h2>
              <p className="text-gray-300 mb-6 text-lg">
                Join thousands of players in fair blockchain duels
              </p>
              <Link 
                href="/app"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <Target size={24} />
                Start Playing Now
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}