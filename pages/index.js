import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Swords, Users, Crown, AlertTriangle } from 'lucide-react';
import FarcasterInit from '../components/FarcasterInit';

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
        url: `${baseUrl}`,
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
            <div className="mb-6">
              <div className="mb-3">
                <img src="/icon.png" alt="Crypto Duel" className="w-16 h-16 mx-auto" />
              </div>
              <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide leading-tight pb-1">
                Crypto Duel
              </h1>
              <p className="text-sm mb-4 text-gray-300">
                4 game modes with fair blockchain randomness
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 max-w-lg mx-auto border border-white/20 shadow-2xl">
              <h2 className="text-lg font-semibold mb-3 text-cyan-300 text-center">Game Modes</h2>
              
              {/* Game modes in 2x2 grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black/20 rounded-xl p-2 border border-white/10 text-center">
                  <Swords size={18} className="text-green-400 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-white">Duels (1v1)</div>
                </div>
                <div className="bg-black/20 rounded-xl p-2 border border-white/10 text-center">
                  <Users size={18} className="text-purple-400 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-white">Battle Royale 5</div>
                </div>
                <div className="bg-black/20 rounded-xl p-2 border border-white/10 text-center">
                  <Crown size={18} className="text-orange-400 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-white">Battle Royale 100</div>
                </div>
                <div className="bg-black/20 rounded-xl p-2 border border-white/10 text-center">
                  <Crown size={18} className="text-red-400 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-white">Battle Royale 1000</div>
                </div>
              </div>
              
              <div className="p-2 bg-cyan-400/10 rounded-xl border border-cyan-400/20">
                <p className="text-xs text-cyan-200 text-center">
                  <strong>Fair & Transparent:</strong> Blockchain randomness!
                </p>
              </div>
              
              {/* Terms & Conditions Checkbox */}
              <div className="mt-4 p-3 bg-red-500/10 backdrop-blur-sm rounded-xl border border-red-500/30">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={16} className="text-red-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-red-200 mb-2">
                      <strong>Legal Requirement:</strong> You must acknowledge risks before playing.
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

              <div className="mt-4">
                <a 
                  href="/app"
                  className={`inline-flex items-center justify-center w-full font-bold py-3 px-6 rounded-2xl text-center text-base transition-all duration-300 shadow-lg ${
                    termsAccepted 
                      ? 'bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-500 hover:to-cyan-600 text-white transform hover:scale-105 hover:shadow-xl' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                  onClick={termsAccepted ? undefined : (e) => e.preventDefault()}
                >
                  <Swords size={20} className="mr-2" />
                  Explore
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
      
      {/* Farcaster SDK Initialization */}
      <FarcasterInit />
    </>
  );
}