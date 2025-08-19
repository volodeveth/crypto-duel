import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Swords, Play, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Load terms acceptance from localStorage on mount
  useEffect(() => {
    try {
      const accepted = localStorage.getItem('cd_terms_accepted');
      setTermsAccepted(accepted === 'true');
    } catch (error) {
      // Ignore localStorage errors
    }
  }, []);

  // Save terms acceptance to localStorage
  const handleTermsChange = (accepted) => {
    setTermsAccepted(accepted);
    try {
      localStorage.setItem('cd_terms_accepted', accepted.toString());
    } catch (error) {
      // Ignore localStorage errors
    }
  };
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
              <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide leading-tight pb-2">
                Crypto Duel
              </h1>
              <p className="text-xl mb-8 text-gray-300">
                Challenge players worldwide & win ETH in provably fair duels
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-lg mx-auto border border-white/20 shadow-2xl">
              <h2 className="text-2xl font-semibold mb-6 text-cyan-300">Game Modes</h2>
              <ul className="text-left space-y-3 text-gray-200">
                <li className="flex items-center">
                  <span className="text-green-400 mr-3">🎯</span>
                  <strong>Duels (1v1):</strong> 1.8x multiplier, instant matches
                </li>
                <li className="flex items-center">
                  <span className="text-purple-400 mr-3">⚔️</span>
                  <strong>Battle Royale 5:</strong> 4.5x multiplier, 5 players
                </li>
                <li className="flex items-center">
                  <span className="text-orange-400 mr-3">🔥</span>
                  <strong>Battle Royale 100:</strong> 90x multiplier, 100 players
                </li>
                <li className="flex items-center">
                  <span className="text-red-400 mr-3">💥</span>
                  <strong>Battle Royale 1000:</strong> 900x multiplier, 1000 players
                </li>
              </ul>
              
              <div className="mt-6 p-4 bg-cyan-400/10 rounded-xl border border-cyan-400/20">
                <p className="text-sm text-cyan-200">
                  <strong>Fair & Transparent:</strong> Powered by blockchain randomness. All players have equal winning chances!
                </p>
              </div>
              
              {/* Terms & Conditions Checkbox */}
              <div className="mt-6 p-4 bg-red-500/10 backdrop-blur-sm rounded-xl border border-red-500/30">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle size={20} className="text-red-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm text-red-200 mb-2">
                      <strong>Legal Requirement:</strong> You must acknowledge the risks and terms before playing.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => handleTermsChange(e.target.checked)}
                        className="mt-1 w-4 h-4 text-green-600 bg-gray-900 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-200">
                        <span className="text-red-400">*</span> I have read and agree to the{' '}
                        <Link 
                          href="/terms-and-disclaimers" 
                          className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Terms of Service & Risk Disclaimer
                        </Link>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <a 
                  href="/app"
                  className={`inline-flex items-center justify-center w-full font-bold py-4 px-8 rounded-2xl text-center text-lg transition-all duration-300 shadow-lg ${
                    termsAccepted 
                      ? 'bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-500 hover:to-cyan-600 text-white transform hover:scale-105 hover:shadow-xl' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                  onClick={termsAccepted ? undefined : (e) => e.preventDefault()}
                >
                  <Play size={24} className="mr-2" />
                  Start Playing Now
                </a>
                
                {!termsAccepted && (
                  <p className="text-xs text-red-400 mt-2 text-center">
                    Please accept the terms and conditions to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}