import cron from 'node-cron';
import { Lead, NbaConfig } from '../models/index.js';
import * as notificationService from '../services/notification.service.js';

export const stuckCasesJob = cron.schedule('0 1 * * *', async () => {
  try {
    console.log('Running Stuck Cases Job...');
    const config = await NbaConfig.findOne();
    const thresholdDays = config?.stuckCaseThresholdDays || 3;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const leadsToMark = await Lead.find({
      stage: { $nin: ['DISBURSED', 'CLOSED_WON', 'CLOSED_LOST'] },
      isStuck: false,
      lastActivityAt: { $lt: thresholdDate }
    });

    if (leadsToMark.length === 0) return;

    const leadIds = leadsToMark.map(l => l._id);
    
    await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { isStuck: true, stuckSince: new Date() } }
    );

    for (const lead of leadsToMark) {
      await notificationService.sendStuckCaseNotification(lead);
    }
    console.log(`Marked ${leadsToMark.length} leads as stuck.`);
  } catch (err) {
    console.error('Error in Stuck Cases Job:', err);
  }
}, { scheduled: false });
