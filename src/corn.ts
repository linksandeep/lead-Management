import cron from 'node-cron';
import reminder from './models/reminder';
import { io } from './server';

// Prevent multiple cron jobs (important for nodemon / PM2)
const shouldRunCron =
  !process.env.NODE_APP_INSTANCE ||
  process.env.NODE_APP_INSTANCE === '0';

if (shouldRunCron) {
  console.log('🕒 Reminder cron started');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      console.log('⏰ CRON CHECK @', now.toISOString());

      const dueReminders = await reminder.find({
        remindAt: { $lte: now },
        status: 'pending'
      });

      console.log('📌 Due reminders found:', dueReminders.length);

      for (const rem of dueReminders) {
        console.log('📤 Emitting reminder:', rem.title);

        io.to(rem.user.toString()).emit('reminder', {
          reminderId: rem._id,
          title: rem.title,
          note: rem.note,
          reminderAt: rem.remindAt
        });

        rem.status = 'triggered';
        await rem.save();
      }
    } catch (error) {
      console.error('🔥 CRON ERROR:', error);
    }
  });
}
