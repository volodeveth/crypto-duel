import db from '@/lib/postgres-database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, newUsername } = req.body;
    
    if (!fid || !newUsername) {
      return res.status(400).json({ error: 'FID and newUsername are required' });
    }

    console.log(`🔄 Updating username for FID ${fid} to "${newUsername}"`);
    
    // Update user username
    const result = await db.updateUser(fid, { 
      username: newUsername 
    });
    
    if (result.success) {
      console.log(`✅ Username updated successfully for FID ${fid}`);
      return res.status(200).json({
        success: true,
        message: `Username updated to "${newUsername}" for FID ${fid}`,
        user: result.user
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to update username' 
      });
    }

  } catch (error) {
    console.error('❌ Update username error:', error);
    return res.status(500).json({
      error: 'Failed to update username',
      message: error.message
    });
  }
}