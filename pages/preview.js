import Head from 'next/head';
import FarcasterInit from '../components/FarcasterInit';

// This page is optimized for Farcaster Preview Tool
export default function PreviewApp() {
  return (
    <>
      <Head>
        <title>Crypto Duel - Preview</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Minimal meta tags for preview */}
        <meta name="fc:miniapp" content={JSON.stringify({
          version: "1",
          imageUrl: "/icon.png",
          button: {
            title: "🎮 Duel Now",
            action: {
              type: "launch_frame",
              name: "Crypto Duel",
              url: "/app",
              splashImageUrl: "/icon.png",
              splashBackgroundColor: "#8B5CF6"
            }
          }
        })} />
      </Head>
      
      <FarcasterInit />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-4">
            <img src="/icon2.png" alt="Crypto Duel" className="w-24 h-24 mx-auto" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Crypto Duel
          </h1>
          <p className="text-xl mb-8 text-gray-200">
            Ready to play! Farcaster SDK initialized.
          </p>
          <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4">
            <p className="text-green-300 font-medium">
              ✅ Mini App Ready Signal Sent Successfully!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}