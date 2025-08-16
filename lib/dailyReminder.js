import { sendDailyReminderNotification } from './notifications.js';
import db from './database.js';

export async function getActiveFarcasterUsers() {
  return db.getUsersWithNotificationsEnabled();
}

export async function sendDailyReminders() {
  console.log('📅 Starting daily reminder process...');
  
  try {
    const users = await getActiveFarcasterUsers();
    console.log(`👥 Found ${users.length} users with notifications enabled`);
    
    if (users.length === 0) {
      console.log('ℹ️ No users to send reminders to');
      return { sent: 0, skipped: 0, errors: 0 };
    }

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Check if we already sent a reminder today
        const now = new Date();
        const today = now.toISOString().slice(0, 10); // YYYY-MM-DD format
        
        if (user.last_notification_sent) {
          const lastSent = new Date(user.last_notification_sent);
          const lastSentDate = lastSent.toISOString().slice(0, 10);
          
          if (lastSentDate === today) {
            console.log(`⏭️ Skipping FID ${user.fid} - already sent today`);
            skipped++;
            continue;
          }
        }

        console.log(`📬 Sending daily reminder to FID ${user.fid} (${user.username || 'unknown'})`);
        
        await sendDailyReminderNotification(user);
        
        // Update last notification sent timestamp
        db.updateUser(user.fid, { 
          last_notification_sent: now.toISOString() 
        });

        sent++;
        console.log(`✅ Daily reminder sent to FID ${user.fid}`);

        // Add small delay between notifications to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to send daily reminder to FID ${user.fid}:`, error);
        errors++;
      }
    }

    const summary = { sent, skipped, errors, total: users.length };
    console.log('📊 Daily reminder summary:', summary);
    
    return summary;

  } catch (error) {
    console.error('❌ Daily reminder process failed:', error);
    throw error;
  }
}

export default {
  getActiveFarcasterUsers,
  sendDailyReminders
};