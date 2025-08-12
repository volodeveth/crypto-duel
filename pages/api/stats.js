export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Here you can add database queries for global stats
    const stats = {
      totalDuels: 0,
      totalVolume: "0",
      activePlayers: 0,
      biggestWin: "0"
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}