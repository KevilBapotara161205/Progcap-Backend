import cron from 'node-cron';
import { Lead, NbaConfig } from '../models/index.js';
import * as notificationService from '../services/notification.service.js';

export const sanctionExpiryJob = cron.schedule('0 8 * * *', async () => {
  try {
    console.log('Running Sanction Expiry Job...');
    const config = await NbaConfig.findOne();
    const alertDays = config?.sanctionExpiryAlertDays || [7, 3];
    const now = new Date();

    for (const days of alertDays) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + days);
      
      const startOfDay = new Date(targetDate.setHours(0,0,0,0));
      const endOfDay = new Date(targetDate.setHours(23,59,59,999));

      const leads = await Lead.find({
        sanctionExpiryDate: { $gte: startOfDay, $lte: endOfDay },
        stage: { $nin: ['DISBURSED', 'CLOSED_WON', 'CLOSED_LOST'] }
      });

      for (const lead of leads) {
        await notificationService.sendToUser(lead.assignedTo, {
          title: 'Sanction Expiry Alert',
          body: `Sanction for Lead ${lead._id} expires in ${days} days.`,
          data: { leadId: lead._id.toString() }
        });
      }
    }
  } catch (err) {
    console.error('Error in Sanction Expiry Job:', err);
  }
}, { scheduled: false });
