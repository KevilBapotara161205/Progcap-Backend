import { SyncQueue, Lead, Visit, KycDocument } from '../models/index.js';
import { success, error } from '../utils/response.js';

const processAction = async (actionType, payload, rmId) => {
  switch (actionType) {
    case 'LEAD_STAGE_UPDATE': {
      // Last-Write-Wins (LWW) Conflict Resolution
      const actionTime = payload.timestamp ? new Date(payload.timestamp) : new Date();
      const existingLead = await Lead.findById(payload.leadId);
      if (existingLead && existingLead.lastActivityAt > actionTime) {
        throw new Error('Conflict: Backend has a newer version of this lead (LWW rejection)');
      }
      
      await Lead.findOneAndUpdate(
        { _id: payload.leadId, assignedTo: rmId },
        { stage: payload.stage, lastActivityAt: actionTime }
      );
      break;
    }

    case 'VISIT_CHECKIN':
      await Visit.create({
        lead: payload.leadId,
        rm: rmId,
        dealer: payload.dealerId,
        checkInLocation: payload.checkInLocation,
        checkInTime: new Date(payload.checkInTime),
        geofenceStatus: payload.geofenceStatus,
        notes: payload.notes
      });
      break;

    case 'VISIT_CHECKOUT': {
      // LWW Conflict Resolution for Visit
      const actionTime = payload.timestamp ? new Date(payload.timestamp) : new Date();
      const existingVisit = await Visit.findById(payload.visitId);
      if (existingVisit && existingVisit.updatedAt > actionTime) {
        throw new Error('Conflict: Backend has a newer version of this visit (LWW rejection)');
      }

      await Visit.findOneAndUpdate(
        { _id: payload.visitId, rm: rmId },
        {
          checkOutTime: new Date(payload.checkOutTime),
          visitDuration: payload.visitDuration,
          notes: payload.notes
        }
      );
      break;
    }

    case 'SELF_SOURCE_LEAD': {
      // Needs dealer creation and lead creation just like lead.controller.js
      const { Dealer } = await import('../models/index.js');
      const dealer = await Dealer.create({
        businessName: payload.merchantName,
        contactPerson: { name: payload.merchantName, phone: payload.phone },
        status: 'INACTIVE', 
        createdBy: rmId,
        location: payload.location ? { type: 'Point', coordinates: [payload.location.lng, payload.location.lat] } : undefined
      });

      await Lead.create({
        dealer: dealer._id,
        assignedTo: rmId,
        stage: 'PENDING_REVIEW',
        expectedValue: payload.expectedValue,
        createdBy: rmId
      });
      break;
    }

    case 'UPLOAD_DOCUMENT': {
      const kycDoc = await KycDocument.create({
        lead: payload.leadId,
        docType: payload.docType,
        s3Url: payload.s3Url,
        status: 'PENDING'
      });
      break;
    }

    // Expand as needed for KYC_UPLOAD, SELF_SOURCE_LEAD, etc.
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
};

export const syncUp = async (req, res, next) => {
  try {
    const { deviceId, queue } = req.body; // queue is an array of actions
    const results = [];

    for (const item of queue) {
      const syncRecord = new SyncQueue({
        deviceId,
        rm: req.user._id,
        actionType: item.actionType,
        payload: item.payload,
        status: 'PENDING',
        lastAttemptAt: new Date()
      });

      try {
        await processAction(item.actionType, item.payload, req.user._id);
        
        syncRecord.status = 'SYNCED';
        syncRecord.syncedAt = new Date();
        await syncRecord.save();
        
        results.push({ id: item.id, status: 'SYNCED' });
      } catch (processErr) {
        syncRecord.status = 'FAILED';
        syncRecord.errorMessage = processErr.message;
        await syncRecord.save();
        
        results.push({ id: item.id, status: 'FAILED', error: processErr.message });
      }
    }

    return success(res, results, 'Sync Up Completed');
  } catch (err) {
    next(err);
  }
};

export const syncDown = async (req, res, next) => {
  try {
    const { lastSyncedAt } = req.query;
    const queryDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);
    const rmId = req.user._id;

    const leads = await Lead.find({ assignedTo: rmId, updatedAt: { $gt: queryDate } }).populate('anchor dealer');
    const visits = await Visit.find({ rm: rmId, updatedAt: { $gt: queryDate } });
    
    // In a real app, also fetch updated configs, catalogs, targets etc.

    return success(res, {
      leads,
      visits,
      timestamp: new Date()
    });
  } catch (err) {
    next(err);
  }
};
