// API endpoint to get Farcaster username by wallet address
// Uses Neynar API to look up user by verified address

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({ error: 'Address parameter required' });
  }

  try {
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    
    if (!neynarApiKey) {
      console.error('NEYNAR_API_KEY not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Query Neynar API for user by verified address
    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address.toLowerCase()}`;
    
    console.log(`🔍 Querying Neynar API for address: ${address}`);
    
    const response = await fetch(neynarUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api_key': neynarApiKey
      }
    });

    if (!response.ok) {
      console.error(`Neynar API error: ${response.status} ${response.statusText}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const data = await response.json();
    console.log('📡 Neynar API response:', JSON.stringify(data, null, 2));

    // Check if any users were found
    if (data && data[address.toLowerCase()] && data[address.toLowerCase()].length > 0) {
      const user = data[address.toLowerCase()][0]; // Take first user if multiple
      const username = user.username;
      
      console.log(`✅ Found Farcaster user: @${username} for address ${address}`);
      
      return res.status(200).json({ 
        username,
        fid: user.fid,
        display_name: user.display_name,
        address: address.toLowerCase()
      });
    } else {
      console.log(`ℹ️ No Farcaster user found for address: ${address}`);
      return res.status(404).json({ error: 'No Farcaster user found for this address' });
    }

  } catch (error) {
    console.error('❌ Error fetching Farcaster username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}