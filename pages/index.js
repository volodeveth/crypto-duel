import Head from 'next/head';
import { Swords, Play } from 'lucide-react';

export default function Home() {
  const baseUrl = 'https://cryptoduel.xyz';
  
  const embedData = {
    version: "1",
    imageUrl: `${baseUrl}/image.png`,
    button: {
      title: "🎮 Start Dueling",
      action: {
        type: "launch_miniapp",
        name: "Crypto Duel",
        url: `${baseUrl}/app`,
        splashImageUrl: `${baseUrl}/splash.png`,
        splashBackgroundColor: "#8B5CF6"
      }
    }
  };

  return (
    <>
      <Head>
        <title>Crypto Duel - Compete and Win ETH!</title>
        <meta name="fc:miniapp" content={JSON.stringify(embedData)} />
        <meta property="og:title" content="Crypto Duel" />
        <meta property="og:description" content="ETH dueling game - Challenge and win!" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta property="og:image" content={`${baseUrl}/image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${baseUrl}/image.png`} />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-8">
              <div className="mb-4">
                <img src="/icon.png" alt="Crypto Duel" className="w-24 h-24 mx-auto" />
              </div>
              <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide">
                Crypto Duel
              </h1>
              <p className="text-xl mb-8 text-gray-300">
                Challenge players worldwide & win ETH in provably fair duels
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-lg mx-auto border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-semibold mb-6 text-cyan-300">How to Play</h2>
              <ul className="text-left space-y-3 text-gray-200">
                <li className="flex items-center">
                  <span className="text-green-400 mr-3">1.</span>
                  Choose your bet amount
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3">2.</span>
                  Wait for an opponent
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3">3.</span>
                  Winner gets 1.8x their bet
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3">4.</span>
                  50/50 chance to win - Fair random
                </li>
              </ul>
              
              <div className="mt-6 p-4 bg-cyan-400/10 rounded-xl border border-cyan-400/20">
                <p className="text-sm text-cyan-200">
                  <strong>Fair & Transparent:</strong> Powered by blockchain randomness. Each player has exactly 50% chance to win!
                </p>
              </div>
              
              <div className="mt-6">
                <a 
                  href="/app"
                  className="inline-flex items-center justify-center w-full bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-500 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-2xl text-center text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Play size={24} className="mr-2" />
                  Start Playing Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}