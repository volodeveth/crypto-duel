// API endpoint to get multiple Farcaster usernames by wallet addresses
// Uses Neynar API bulk endpoint for efficient batch lookup

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { addresses } = req.body;
  
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
    return res.status(400).json({ error: 'Addresses array required' });
  }

  // Limit to 100 addresses per request to avoid API limits
  if (addresses.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 addresses per request' });
  }

  try {
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    
    if (!neynarApiKey) {
      console.error('NEYNAR_API_KEY not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Normalize addresses to lowercase
    const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
    const addressesParam = normalizedAddresses.join(',');

    // Query Neynar API for users by verified addresses (bulk)
    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}`;
    
    console.log(`🔍 Querying Neynar API for ${normalizedAddresses.length} addresses`);
    
    const response = await fetch(neynarUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api_key': neynarApiKey
      }
    });

    if (!response.ok) {
      console.error(`Neynar API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Neynar API error' });
    }

    const data = await response.json();
    console.log(`📡 Neynar API found users for ${Object.keys(data).length} addresses`);

    // Transform response to address -> username mapping
    const result = {};
    
    normalizedAddresses.forEach(address => {
      if (data[address] && data[address].length > 0) {
        const user = data[address][0]; // Take first user if multiple
        result[address] = {
          username: user.username,
          fid: user.fid,
          display_name: user.display_name,
          pfp_url: user.pfp_url
        };
        console.log(`✅ Found @${user.username} for ${address}`);
      } else {
        result[address] = null;
      }
    });

    return res.status(200).json({ 
      usernames: result,
      total_requested: normalizedAddresses.length,
      total_found: Object.values(result).filter(user => user !== null).length
    });

  } catch (error) {
    console.error('❌ Error fetching Farcaster usernames:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}