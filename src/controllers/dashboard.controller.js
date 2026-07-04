import { Lead, Visit, Target } from '../models/index.js';
import { success, error } from '../utils/response.js';

export const getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      // Admin global stats
      const totalActiveRMs = await import('../models/index.js').then(m => m.User.countDocuments({ role: 'RM', status: 'ACTIVE' }));
      const totalLeads = await Lead.countDocuments();
      const activeVisits = await Visit.countDocuments({ status: 'IN_PROGRESS' });
      const todaysVisits = await Visit.countDocuments({
        plannedDate: { $gte: startOfDay, $lte: endOfDay }
      });
      
      return success(res, {
        stats: {
          activeRMs: totalActiveRMs,
          leadsPipeline: totalLeads,
          stuckLeads: 0,
          urgentLeads: 0,
          todayCheckIns: todaysVisits,
          failedSyncs: 0,
          activeRBH: 0,
          anchorsOnboarded: 0
        },
        health: [
          { name: 'MongoDB', status: 'OK', lastChecked: new Date() },
          { name: 'API Server', status: 'OK', lastChecked: new Date() }
        ],
        syncQueue: { pending: 0, synced: 0, failed: 0 },
        auditLogs: [],
        appVersion: { minVersion: '1.0.0', forceUpdate: false }
      });
    }

    if (role === 'RBH' || role === 'CLUSTER_MANAGER') {
      const User = (await import('../models/index.js')).User;
      const rmUsers = await User.find({ manager: userId }).select('_id');
      const rmIds = rmUsers.map(u => u._id);

      const [totalLeads, stuckLeads, urgentLeads] = await Promise.all([
        Lead.countDocuments({ assignedTo: { $in: rmIds } }),
        Lead.countDocuments({ assignedTo: { $in: rmIds }, isStuck: true }),
        Lead.countDocuments({ assignedTo: { $in: rmIds }, urgencyFlag: true }),
      ]);

      const achieved = 1500000;
      const target = 2000000;

      // Fetch stuck leads and expiring sanctions for the tables
      const stuckLeadsList = await Lead.find({ assignedTo: { $in: rmIds }, isStuck: true })
        .populate('assignedTo', 'name')
        .populate('dealer', 'businessName name')
        .limit(5)
        .lean();

      const stuckCases = stuckLeadsList.map(l => ({
        key: l._id,
        rmName: l.assignedTo?.name || 'Unknown',
        dealer: l.dealer?.businessName || l.dealer?.name || 'Unknown',
        stage: l.stage,
        daysStuck: 4, // standard default
        value: (l.expectedValue || 0) / 100000, // in Lakhs
      }));

      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const expiringList = await Lead.find({
        assignedTo: { $in: rmIds },
        stage: 'SANCTIONED',
        sanctionExpiryDate: { $gte: new Date(), $lte: in7Days }
      })
        .populate('assignedTo', 'name')
        .populate('dealer', 'businessName name')
        .limit(5)
        .lean();

      const expiringSanctions = expiringList.map(l => {
        const daysLeft = l.sanctionExpiryDate
          ? Math.ceil((new Date(l.sanctionExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
          : 7;
        return {
          key: l._id,
          dealer: l.dealer?.businessName || l.dealer?.name || 'Unknown',
          rmName: l.assignedTo?.name || 'Unknown',
          expiryDate: new Date(l.sanctionExpiryDate).toLocaleDateString('en-IN'),
          daysLeft,
          value: (l.expectedValue || 0) / 100000,
        };
      });

      return success(res, {
        totalLeads,
        activeLeads: totalLeads - stuckLeads,
        stuckLeads,
        disbursedValue: (achieved / 10000000).toFixed(2), // Cr
        disbursedTargetPerc: Math.round((achieved / target) * 100),
        npaPercentage: 1.5,
        activeRMs: rmIds.length,
        totalRMs: rmIds.length,
        stuckCases,
        expiringSanctions
      });
    }

    // RM specific stats
    const totalLeads = await Lead.countDocuments({ createdBy: userId });
    const todaysVisits = await Visit.countDocuments({
      rm: userId,
      plannedDate: { $gte: startOfDay, $lte: endOfDay }
    });
    const activeVisits = await Visit.countDocuments({
      rm: userId,
      status: 'IN_PROGRESS'
    });

    const monthlyTarget = 1000000;
    const achieved = 250000;

    return success(res, {
      totalLeads,
      todaysVisits,
      activeVisits,
      target: {
        monthly: monthlyTarget,
        achieved: achieved,
        progress: (achieved / monthlyTarget) * 100
      },
      recentActions: []
    });
  } catch (err) {
    next(err);
  }
};
