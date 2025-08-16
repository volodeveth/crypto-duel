import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { EthWithUsd } from '../../lib/ethPrice';

const CONTRACT_ABI = [
  "event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed)",
  "function getDuel(uint256 duelId) external view returns (tuple(uint256 id, address player1, address player2, uint256 betAmount, uint256 timestamp, address winner, bool completed, uint256 randomSeed))"
];

const RPC = 'https://mainnet.base.org';
const BASESCAN = 'https://basescan.org';
const CONTRACT_ADDRESS = '0x238300D6570Deee3765d72Fa8e2af447612FaE06';

export default function DuelDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [duel, setDuel] = useState(null);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const provider = new ethers.JsonRpcProvider(RPC);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const d = await contract.getDuel(id);

        if (!d || !d.id) {
          setError('Duel not found');
          setLoading(false);
          return;
        }

        setDuel({
          id: d.id.toString(),
          player1: d.player1,
          player2: d.player2,
          betEth: Number(ethers.formatEther(d.betAmount || 0)),
          timestamp: Number(d.timestamp || 0) * 1000,
          winner: d.winner,
          completed: d.completed,
          randomSeed: d.randomSeed?.toString() || ''
        });

        // If completed, fetch its DuelCompleted tx hash
        if (d.completed) {
          const iface = new ethers.Interface(CONTRACT_ABI);
          const topic = iface.getEvent('DuelCompleted').topicHash;
          const logs = await provider.getLogs({
            fromBlock: 0,
            toBlock: 'latest',
            address: CONTRACT_ADDRESS,
            topics: [topic, ethers.zeroPadValue(ethers.toBeHex(Number(d.id)), 32)]
          });
          setTxHash(logs?.[0]?.transactionHash || '');
        } else {
          setTxHash('');
        }
      } catch (e) {
        setError(e.message || 'Failed to load duel');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const short = (a='') => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';

  return (
    <>
      <Head>
        <title>Duel #{id} — Crypto Duel</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-xl mx-auto p-4">
          <div className="text-center mb-6">
            <div className="mb-2">
              <img src="/icon.png" alt="Crypto Duel" className="w-14 h-14 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Duel #{id}</h1>
            <div className="mt-2 flex items-center justify-center gap-3">
              <Link href="/app" className="text-sm text-purple-200 hover:text-purple-100">🎮 Back to Game</Link>
              <span className="opacity-40">•</span>
              <Link href="/user" className="text-sm text-purple-200 hover:text-purple-100">👤 My Duels</Link>
            </div>
          </div>

          {loading && (
            <div className="text-center py-10">
              <div className="animate-spin mb-4">
                <img src="/icon.png" alt="Loading" className="w-12 h-12 mx-auto" />
              </div>
              <p>Loading duel...</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && duel && (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  {duel.completed ? (
                    <span className="text-green-400">Completed</span>
                  ) : (
                    <span className="text-yellow-400">Pending</span>
                  )}
                </div>
                <div className="text-sm text-yellow-400 font-semibold">
                  Bet: <EthWithUsd amount={duel.betEth} decimals={5} />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {short(duel.player1)} vs {short(duel.player2)}{duel.timestamp ? ` • ${new Date(duel.timestamp).toLocaleString()}` : ''}
              </div>

              <div className="mt-4">
                <div className="text-sm text-gray-400 mb-1">Random Seed</div>
                <div className="font-mono text-xs break-all bg-black/20 border border-gray-700 rounded p-2">
                  {duel.randomSeed || '(not available yet)'}
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-2">
                {duel.completed && txHash && (
                  <a
                    href={`${BASESCAN}/tx/${txHash}#eventlog`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    🔍 View DuelCompleted on BaseScan
                  </a>
                )}
                <a
                  href={`${BASESCAN}/address/${CONTRACT_ADDRESS}#events`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-xs"
                >
                  📜 All contract events
                </a>
              </div>

              {duel.completed && (
                <div className="mt-4 text-sm">
                  <span className="text-gray-400 mr-1">Winner:</span>
                  <span className="font-mono">{duel.winner}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}