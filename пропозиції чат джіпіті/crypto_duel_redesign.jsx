import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Wallet, Swords, Copy, Share2 } from "lucide-react";

export default function CryptoDuel2025() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="flex justify-center mb-4">
          <Swords size={64} className="text-cyan-400 drop-shadow-lg" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
          Crypto Duel 2025
        </h1>
        <p className="mt-3 text-lg text-gray-300">
          Challenge players worldwide & win ETH in provably fair duels
        </p>
      </motion.div>

      {/* How to Play */}
      <Card className="w-full max-w-2xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl backdrop-blur">
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold text-cyan-300 mb-4 text-center">
            How to Play
          </h2>
          <ul className="space-y-3 text-gray-200">
            <li>① Choose your bet amount</li>
            <li>② Wait for an opponent to join</li>
            <li>③ Winner gets <span className="text-green-400 font-bold">1.8x</span> their bet</li>
            <li>④ <span className="text-yellow-300">50/50</span> chance to win — fair on-chain randomness</li>
          </ul>
          <div className="mt-6 text-sm text-center text-gray-400">
            Fair & Transparent: Powered by blockchain randomness. Each player has exactly 50% chance to win.
          </div>
          <div className="mt-6 flex justify-center">
            <Button size="lg" className="rounded-2xl text-lg px-8 py-6 bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-500 hover:to-cyan-600">
              🎮 Start Playing Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Duel Arena */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mt-12"
      >
        <Card className="bg-white/10 border border-white/20 shadow-2xl rounded-2xl backdrop-blur">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
                <Swords size={24} /> Duel Arena
              </h2>
              <Button variant="outline" className="text-sm bg-white/10 border-white/20">
                <Wallet size={16} className="mr-2" /> Disconnect
              </Button>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-400">Connected Wallet:</p>
              <p className="font-mono text-green-300 text-sm">0x77AF...8cA6E</p>
            </div>

            <Tabs defaultValue="bets" className="w-full">
              <TabsList className="flex justify-around bg-white/10 p-2 rounded-xl">
                <TabsTrigger value="bets" className="text-white">Choose Bet</TabsTrigger>
                <TabsTrigger value="myduels" className="text-white">My Duels</TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-white">Leaderboard</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0.00001, 0.0001, 0.001, 0.01].map((eth, idx) => (
                <Card key={idx} className="bg-black/30 border border-white/10 rounded-xl hover:scale-105 transition-transform cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <p className="text-cyan-300 font-semibold">{eth} ETH</p>
                    <p className="text-gray-300 text-sm mt-1">Win: {(eth*1.8).toFixed(5)} ETH</p>
                    <p className="text-green-400 text-xs mt-2">1.8x multiplier</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">Fair Play: Winner determined by on-chain randomness</p>
              <div className="flex justify-center gap-4 mt-4">
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Go to My Duels
                </Button>
                <Button variant="destructive">Cancel & Refund</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
