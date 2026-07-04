import { stuckCasesJob } from './stuckCases.job.js';
import { sanctionExpiryJob } from './sanctionExpiry.job.js';

export const initCronJobs = () => {
  console.log('Initializing cron jobs...');
  stuckCasesJob.start();
  sanctionExpiryJob.start();
};
