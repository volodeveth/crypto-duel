export default function handler(req, res) {
  const baseUrl = 'https://cryptoduel.xyz';
  
  // Updated Farcaster manifest structure - using 'miniapp' instead of 'frame'
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjEyMTUyLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4MEJGNDVGOTY3RTkwZmZENjA2MzVkMUFDMTk1MDYyYTNBOUZjQzYyQiJ9",
      payload: "eyJkb21haW4iOiJjcnlwdG9kdWVsLnh5eiJ9Cg==",
      signature: "MHhmMTUwMWRjZjRhM2U1NWE1ZjViNGQ5M2JlNGIxYjZiOGE0ZjcwYWQ5YTE1OTNmNDk1NzllNTA2YjJkZGZjYTBlMzI4ZmRiNDZmNmVjZmFhZTU4NjYwYzBiZDc4YjgzMzc2MDAzYTkxNzhkZGIyZGIyZmM5ZDYwYjU2YTlmYzdmMDFj"
    },
    // Top-level fields for Farcaster compatibility
    version: "1",
    name: "Crypto Duel",
    iconUrl: `${baseUrl}/icon.png`,
    homeUrl: `${baseUrl}`,
    imageUrl: `${baseUrl}/icon.png`,
    buttonTitle: "🎮 Duel Now",
    splashImageUrl: `${baseUrl}/splash.png`,
    splashBackgroundColor: "#8B5CF6",
    description: "ETH gaming platform with 4 modes: Duels (1v1), Battle Royale 5/100/1000 players. Fair blockchain randomness!",
    webhookUrl: `${baseUrl}/api/farcaster-webhook`,
    subtitle: "ETH dueling game",
    screenshotUrls: [
      `${baseUrl}/screenshot1.jpg`,
      `${baseUrl}/screenshot2.jpg`,
      `${baseUrl}/screenshot3.jpg`
    ],
    primaryCategory: "games",
    tags: ["crypto", "game", "duel", "battle-royale", "eth", "blockchain", "gaming"],
    heroImageUrl: `${baseUrl}/hero.png`,
    tagline: "4 game modes, fair blockchain randomness!",
    ogTitle: "Crypto Duel - Battle Royale ETH Gaming",
    ogDescription: "ETH gaming platform with Duels (1v1) and Battle Royale (5/100/1000 players). Fair blockchain randomness!",
    ogImageUrl: `${baseUrl}/image.png`,
    castShareUrl: "https://warpcast.com/~/compose?text=Check+out+Crypto+Duel+🎮+4+game+modes%3A+Duels+%26+Battle+Royale!+Win+ETH+with+fair+blockchain+randomness!&embeds[]=https://cryptoduel.xyz",
    // Keep nested structure for compatibility
    miniapp: {
      version: "1",
      name: "Crypto Duel",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: `${baseUrl}`,
      imageUrl: `${baseUrl}/image.png`,
      buttonTitle: "🎮 Duel Now",
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#8B5CF6",
      description: "ETH gaming platform with 4 modes: Duels (1v1), Battle Royale 5/100/1000 players. Fair blockchain randomness!",
      subtitle: "ETH dueling game"
    },
    // Keep frame for backward compatibility
    frame: {
      version: "1",
      name: "Crypto Duel",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: `${baseUrl}`,
      imageUrl: `${baseUrl}/image.png`,
      buttonTitle: "🎮 Duel Now",
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#8B5CF6"
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(manifest);
}