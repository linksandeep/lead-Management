import cron from 'node-cron';
import reminder from './models/reminder';
import { io } from './server';

cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log('⏰ CRON CHECK @', now.toISOString());
  
    const dueReminders = await reminder.find({
      remindAt: { $lte: now },
      status: 'pending'
    });
  
    console.log('📌 Due reminders found:', dueReminders.length);
  
    for (const reminder of dueReminders) {
      console.log('📤 Emitting reminder:', reminder.title);
  
      io.to(reminder.user.toString()).emit('reminder', {
        reminderId: reminder._id,
        title: reminder.title,
        note: reminder.note,
        reminderAt: reminder.remindAt
      });
  
      reminder.status = 'triggered';
      await reminder.save();
    }
  });
  



