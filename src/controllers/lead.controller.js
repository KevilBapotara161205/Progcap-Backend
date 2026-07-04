import { Lead, Dealer } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { paginateQuery, buildPagination } from '../utils/pagination.js';
import { createAuditLog } from '../utils/audit.js';
import * as notificationService from '../services/notification.service.js';

export const getLeads = async (req, res, next) => {
  try {
    const { assignedTo, stage, anchorId, urgencyFlag, isStuck, dateRange } = req.query;
    const filter = {};
    if (assignedTo) filter.assignedTo = assignedTo;
    if (stage) filter.stage = stage;
    if (anchorId) filter.anchor = anchorId;
    if (urgencyFlag) filter.urgencyFlag = urgencyFlag === 'true';
    if (isStuck) filter.isStuck = isStuck === 'true';

    // dateRange filtering (if any) could be added here

    const options = buildPagination(req.query);
    const result = await paginateQuery(Lead, filter, options, 'anchor dealer assignedTo');

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const createLead = async (req, res, next) => {
  try {
    const { anchor, dealer, assignedTo, expectedValue, sanctionExpiryDate, plannedVisitDate, notes } = req.body;
    
    const lead = await Lead.create({
      anchor,
      dealer,
      assignedTo,
      assignedBy: req.user._id,
      stage: 'ASSIGNED',
      expectedValue,
      sanctionExpiryDate,
      plannedVisitDate,
      notes,
      lastActivityAt: new Date(),
      assignmentHistory: [{ rm: assignedTo, assignedBy: req.user._id, assignedAt: new Date(), reason: 'Initial assignment' }]
    });

    await notificationService.sendLeadAssignedNotification(lead);
    await createAuditLog(req.user._id, req.user.role, 'CREATE_LEAD', 'Lead', lead._id, null, lead, req);

    return success(res, lead, 'Lead created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('anchor dealer assignedTo assignedBy');
    if (!lead) return error(res, 'Lead not found', 404);
    return success(res, lead);
  } catch (err) {
    next(err);
  }
};

export const updateStage = async (req, res, next) => {
  try {
    const { stage, notes } = req.body;
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) return error(res, 'Lead not found', 404);

    const previousValue = lead.toObject();
    
    // Optional check: forward progression could go here
    if (lead.isStuck && lead.stage !== stage) {
      lead.isStuck = false;
      lead.stuckSince = undefined;
    }

    lead.stage = stage;
    if (notes) lead.notes = notes;
    lead.lastActivityAt = new Date();

    await lead.save();
    await createAuditLog(req.user._id, req.user.role, 'UPDATE_LEAD_STAGE', 'Lead', lead._id, previousValue, lead, req);

    return success(res, lead, 'Lead stage updated');
  } catch (err) {
    next(err);
  }
};

export const completeKyc = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return error(res, 'Lead not found', 404);

    lead.kycCompleted = true;
    if (lead.stage === 'IN_PROGRESS') {
      lead.stage = 'KYC_SUBMITTED';
    }
    await lead.save();

    return success(res, lead, 'KYC completed successfully');
  } catch (err) {
    next(err);
  }
};

export const assignLead = async (req, res, next) => {
  try {
    const { assignedTo, reason } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return error(res, 'Lead not found', 404);

    const previousValue = lead.toObject();

    lead.assignedTo = assignedTo;
    lead.assignmentHistory.push({ rm: assignedTo, assignedBy: req.user._id, assignedAt: new Date(), reason });
    await lead.save();

    await notificationService.sendLeadAssignedNotification(lead);
    await createAuditLog(req.user._id, req.user.role, 'ASSIGN_LEAD', 'Lead', lead._id, previousValue, lead, req);

    return success(res, lead, 'Lead assigned successfully');
  } catch (err) {
    next(err);
  }
};

export const toggleUrgent = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return error(res, 'Lead not found', 404);

    lead.urgencyFlag = !lead.urgencyFlag;
    await lead.save();

    return success(res, lead, `Lead urgency set to ${lead.urgencyFlag}`);
  } catch (err) {
    next(err);
  }
};

export const getMyLeads = async (req, res, next) => {
  try {
    const { stage, q } = req.query;
    const filter = { assignedTo: req.user._id };
    
    if (stage) filter.stage = stage;
    // q search logic could be added here on populated dealer name
    
    // Not paginated for offline use
    const leads = await Lead.find(filter).populate('anchor dealer').sort({ lastActivityAt: -1 });
    return success(res, leads);
  } catch (err) {
    next(err);
  }
};

export const getStuckLeads = async (req, res, next) => {
  try {
    const { rmId } = req.query;
    const filter = { isStuck: true };
    if (rmId) filter.assignedTo = rmId;
    
    const options = buildPagination(req.query);
    const result = await paginateQuery(Lead, filter, options, 'assignedTo anchor dealer');

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const selfSourceLead = async (req, res, next) => {
  try {
    const { anchor, dealerInfo, expectedValue, notes } = req.body;
    let dealerId = req.body.dealer;
    
    // If no dealer ID is passed, create a new pending dealer
    if (!dealerId && dealerInfo) {
      const newDealer = await Dealer.create({
        anchor,
        businessName: dealerInfo.name || 'Unknown Business',
        phone: dealerInfo.phone,
        status: 'INACTIVE', // Requires RBH approval to become active
        location: dealerInfo.latitude ? { type: 'Point', coordinates: [dealerInfo.longitude, dealerInfo.latitude] } : undefined
      });
      dealerId = newDealer._id;
    }
    
    const lead = await Lead.create({
      anchor,
      dealer: dealerId,
      assignedTo: req.user._id,
      stage: 'ASSIGNED',
      expectedValue,
      notes,
      selfSourced: true,
      selfSourcedStatus: 'PENDING_REVIEW',
      lastActivityAt: new Date(),
    });

    // Notify RM's manager logic here

    return success(res, lead, 'Self-sourced lead created successfully', 201);
  } catch (err) {
    next(err);
  }
};
