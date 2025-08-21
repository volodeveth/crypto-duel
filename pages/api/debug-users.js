import db from '@/lib/postgres-database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Debug: Getting all users from database...');
    
    // Get all users
    const allUsers = await db.getAllUsers();
    
    // Get users with notifications enabled
    const usersWithNotifications = await db.getUsersWithNotificationsEnabled();
    
    // Format users for debugging
    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      fid: user.fid,
      username: user.username,
      wallet_address: user.wallet_address,
      notification_url: user.notification_url ? `${user.notification_url.substring(0, 50)}...` : 'Missing',
      notification_token: user.notification_token ? `${user.notification_token.substring(0, 20)}...` : 'Missing',
      notifications_enabled: user.notifications_enabled,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    return res.status(200).json({
      success: true,
      total_users: allUsers.length,
      users_with_notifications: usersWithNotifications.length,
      users: formattedUsers,
      debug_info: {
        last_user_created: allUsers[0]?.created_at,
        webhook_working: allUsers.length > 1 // More than just test user
      }
    });

  } catch (error) {
    console.error('❌ Debug users error:', error);
    return res.status(500).json({
      error: 'Failed to get users',
      message: error.message,
      stack: error.stack
    });
  }
}