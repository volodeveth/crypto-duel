import { sendDailyReminders } from '@/lib/dailyReminder';

export default async function handler(req, res) {
  console.log('🕐 Daily cron job triggered:', new Date().toISOString());
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const summary = await sendDailyReminders();
    
    return res.status(200).json({
      ok: true,
      message: 'Daily reminders sent successfully',
      summary
    });

  } catch (error) {
    console.error('❌ Daily cron job failed:', error);
    return res.status(500).json({
      error: 'Daily reminder process failed',
      message: error.message
    });
  }
}