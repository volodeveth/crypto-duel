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
    imageUrl: `${baseUrl}/image.png`,
    buttonTitle: "Start Dueling",
    splashImageUrl: `${baseUrl}/splash.png`,
    splashBackgroundColor: "#4338CA",
    description: "Enter the ultimate crypto arena! Compete in 1v1 duels or massive Battle Royale tournaments with real ETH stakes.",
    webhookUrl: `${baseUrl}/api/farcaster-webhook?x-vercel-protection-bypass=89685a1a90e84c0082f0dd4e87c589ec`,
    subtitle: "Blockchain dueling & battle royale game",
    screenshotUrls: [
      `${baseUrl}/screenshot1.jpg`
    ],
    primaryCategory: "games",
    tags: ["crypto", "gaming", "gambling", "eth", "base"],
    heroImageUrl: `${baseUrl}/hero.png`,
    tagline: "Duel. Win. Rise to the Top.",
    ogTitle: "Crypto Duel – Onchain Arena",
    ogDescription: "Challenge players in crypto duels or join massive Battle Royales! Real ETH stakes, fair blockchain results, up to 900x multipliers.",
    // Keep nested structure for compatibility
    miniapp: {
      version: "1",
      name: "Crypto Duel",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: `${baseUrl}`,
      imageUrl: `${baseUrl}/image.png`,
      buttonTitle: "Start Dueling",
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#4338CA",
      description: "Enter the ultimate crypto arena! Compete in 1v1 duels or massive Battle Royale tournaments with real ETH stakes.",
      subtitle: "Blockchain dueling & battle royale game"
    },
    // Keep frame for backward compatibility
    frame: {
      version: "1",
      name: "Crypto Duel",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: `${baseUrl}`,
      imageUrl: `${baseUrl}/image.png`,
      buttonTitle: "Start Dueling",
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#4338CA",
      description: "Enter the ultimate crypto arena! Compete in 1v1 duels or massive Battle Royale tournaments with real ETH stakes.",
      subtitle: "Blockchain dueling & battle royale game",
      webhookUrl: `${baseUrl}/api/farcaster-webhook?x-vercel-protection-bypass=89685a1a90e84c0082f0dd4e87c589ec`,
      screenshotUrls: [
        `${baseUrl}/screenshot1.jpg`
      ],
      primaryCategory: "games",
      tags: ["crypto", "gaming", "gambling", "eth", "base"],
      heroImageUrl: `${baseUrl}/hero.png`,
      tagline: "Duel. Win. Rise to the Top.",
      ogTitle: "Crypto Duel – Onchain Arena",
      ogDescription: "Challenge players in crypto duels or join massive Battle Royales! Real ETH stakes, fair blockchain results, up to 900x multipliers."
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(manifest);
}