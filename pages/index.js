import Head from 'next/head';

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
      
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-8">
              <div className="mb-4">
                <img src="/icon.png" alt="Crypto Duel" className="w-24 h-24 mx-auto" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Crypto Duel
              </h1>
              <p className="text-xl mb-8 text-gray-200">
                Challenge other users and win ETH in fair duels!
              </p>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 max-w-lg mx-auto border border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 text-yellow-400">How to Play:</h2>
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
              
              <div className="mt-6 p-4 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                <p className="text-sm text-yellow-200">
                  <strong>Fair & Transparent:</strong> Uses blockchain randomness for fair results. Each player has exactly 50% chance to win!
                </p>
              </div>
              
              <div className="mt-6">
                <a 
                  href="/app"
                  className="block w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl text-center text-lg transition-all duration-200 transform hover:scale-105"
                >
                  🎮 Start Playing Now!
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}