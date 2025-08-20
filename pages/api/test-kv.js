import db from '@/lib/kv-database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing Vercel KV database connection...');
    
    // Test user operations
    const testUser = {
      fid: 999999,
      username: 'test-user',
      wallet_address: '0x1234567890123456789012345678901234567890',
      notification_url: 'https://test.com/notify',
      notification_token: 'test-token-123',
      notifications_enabled: true
    };

    // Test upsert
    console.log('📝 Testing user upsert...');
    await db.upsertUser(testUser);
    
    // Test get by FID
    console.log('🔍 Testing get user by FID...');
    const userByFid = await db.getUserByFid(testUser.fid);
    
    // Test get by wallet
    console.log('🔍 Testing get user by wallet...');
    const userByWallet = await db.getUserByWallet(testUser.wallet_address);
    
    // Test get all users
    console.log('📊 Testing get all users...');
    const allUsers = await db.getAllUsers();
    
    // Test get users with notifications enabled
    console.log('🔔 Testing get users with notifications enabled...');
    const usersWithNotifications = await db.getUsersWithNotificationsEnabled();

    return res.status(200).json({
      success: true,
      message: 'Vercel KV database test completed successfully!',
      results: {
        userByFid: userByFid ? 'Found' : 'Not found',
        userByWallet: userByWallet ? 'Found' : 'Not found',
        totalUsers: allUsers.length,
        usersWithNotifications: usersWithNotifications.length,
        testUser: {
          fid: userByFid?.fid,
          username: userByFid?.username,
          notifications_enabled: userByFid?.notifications_enabled
        }
      }
    });

  } catch (error) {
    console.error('❌ KV test error:', error);
    return res.status(500).json({
      error: 'KV test failed',
      message: error.message,
      stack: error.stack
    });
  }
}