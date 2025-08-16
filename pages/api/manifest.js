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
    homeUrl: `${baseUrl}/app`,
    imageUrl: `${baseUrl}/icon.png`,
    buttonTitle: "🎮 Duel Now",
    splashImageUrl: `${baseUrl}/splash.png`,
    splashBackgroundColor: "#8B5CF6",
    description: "Challenge other users and win ETH in fair duels! Uses blockchain randomness for fair results.",
    webhookUrl: `${baseUrl}/api/farcaster-webhook`,
    subtitle: "ETH dueling game",
    screenshotUrls: [
      `${baseUrl}/screenshot1.jpg`,
      `${baseUrl}/screenshot2.jpg`,
      `${baseUrl}/screenshot3.jpg`
    ],
    primaryCategory: "games",
    tags: ["crypto", "game", "duel", "eth", "blockchain"],
    heroImageUrl: `${baseUrl}/hero.png`,
    tagline: "Challenge and win ETH!",
    ogTitle: "Crypto Duel - ETH Dueling Game",
    ogDescription: "Challenge other users and win ETH in fair duels! Uses blockchain randomness for fair results.",
    ogImageUrl: `${baseUrl}/image.png`,
    castShareUrl: "https://warpcast.com/~/compose?text=Check+out+Crypto+Duel+🎮+Challenge+and+win+ETH!&embeds[]=https://cryptoduel.xyz",
    // Keep nested structure for compatibility
    miniapp: {
      version: "1",
      name: "Crypto Duel",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: `${baseUrl}/app`,
      imageUrl: `${baseUrl}/image.png`,
      buttonTitle: "🎮 Duel Now",
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#8B5CF6",
      description: "Challenge other users and win ETH in fair duels! Uses blockchain randomness for fair results.",
      subtitle: "ETH dueling game"
    },
    // Keep frame for backward compatibility
    frame: {
      version: "1",
      name: "Crypto Duel",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: `${baseUrl}/app`,
      imageUrl: `${baseUrl}/image.png`,
      buttonTitle: "🎮 Duel Now",
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#8B5CF6"
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(manifest);
}