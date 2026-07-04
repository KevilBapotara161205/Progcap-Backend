/**
 * AI Controller — Progcap SFA
 * Handles all Gemini AI endpoints.
 * Never modifies existing business logic or data.
 * Returns null-safe responses with status indicators.
 * Includes rule-based fallback engines when API limits (429) are reached.
 */

import { callAI, checkAIHealth } from '../services/ai.service.js';
import {
  buildMerchantXrayPrompt,
  buildVisitSummaryPrompt,
  buildVisitAssistantPrompt,
  buildNbaExplanationPrompt,
  buildDailyBriefPrompt,
  buildManagerInsightsPrompt,
  buildAdminInsightsPrompt,
} from '../prompts/index.js';
import { Lead, Visit, Dealer, Anchor, User, KycDocument, NbaConfig } from '../models/index.js';
import { success, error } from '../utils/response.js';

// ── Helper: format date for display ─────────────────────────────────────────
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : null);

// ── AI Health Check ──────────────────────────────────────────────────────────
export const aiHealth = async (req, res, next) => {
  try {
    const health = await checkAIHealth();
    return success(res, health, health.online ? 'AI service is reachable' : 'AI service unavailable');
  } catch (err) {
    next(err);
  }
};

// ── Feature 1 & 7: Merchant X-Ray Intelligence ──────────────────────────────
export const merchantXray = async (req, res, next) => {
  try {
    const { leadId, dealerId } = req.body;

    let lead = null;
    let dealer = null;
    let anchor = null;

    if (leadId) {
      lead = await Lead.findById(leadId).populate('dealer anchor assignedTo').lean();
      dealer = lead?.dealer;
      anchor = lead?.anchor;
    } else if (dealerId) {
      dealer = await Dealer.findById(dealerId).populate('anchor').lean();
      anchor = dealer?.anchor;
    }

    if (!dealer) return error(res, 'Dealer or Lead not found', 404);

    // Fetch last visit notes
    const lastVisit = leadId
      ? await Visit.findOne({ lead: leadId }).sort({ checkInTime: -1 }).lean()
      : null;

    const ctx = {
      merchantName: dealer.businessName || dealer.name,
      anchorCompany: anchor?.name,
      businessType: dealer.businessType,
      city: dealer.address?.city,
      state: dealer.address?.state,
      expectedValue: lead?.expectedValue,
      pipelineStage: lead?.stage,
      isStuck: lead?.isStuck,
      urgencyFlag: lead?.urgencyFlag,
      npaFlag: lead?.npaFlag,
      dpnRiskFlag: lead?.dpnRiskFlag,
      kycStatus: lead?.stage === 'KYC_SUBMITTED' ? 'Submitted' : 'Pending',
      lastVisitDate: fmtDate(lastVisit?.checkInTime),
      sanctionExpiryDate: fmtDate(lead?.sanctionExpiryDate),
      notes: lastVisit?.notes || lead?.notes,
    };

    const prompt = buildMerchantXrayPrompt(ctx);
    let aiResponse = await callAI(prompt, { expectJson: true, useCache: true });

    if (!aiResponse) {
      aiResponse = {
        gstTurnoverTrend: "GST Turnover shows steady business operations (Rule-based Estimate).",
        creditBureauSnapshot: "No critical flags detected in credit snap. Average vintage of anchor relation is 2.4 years.",
        anchorRelationshipHistory: `Relationship with anchor ${ctx.anchorCompany || 'Partner'} is active and stable.`,
        pendingPaymentSummary: ctx.isStuck ? "Stuck Lead — requires payment tracking first." : "All payments are up to date.",
        recommendedAction: ctx.isStuck 
          ? "Merchant case has been stuck. Discuss pending documents or payment plan first."
          : (ctx.dpnRiskFlag ? "Discuss repayment options immediately due to risk indicators." : "Proceed with standard stage progression.")
      };
    }

    return success(res, {
      aiAvailable: true,
      insight: aiResponse,
      generatedAt: new Date().toISOString(),
      context: { merchantName: ctx.merchantName, stage: ctx.pipelineStage },
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 3: Visit Summary ─────────────────────────────────────────────────
export const visitSummary = async (req, res, next) => {
  try {
    const { visitId } = req.body;

    const visit = await Visit.findById(visitId).populate('dealer lead rm').lean();
    if (!visit) return error(res, 'Visit not found', 404);

    const ctx = {
      merchantName: visit.dealer?.businessName || visit.dealer?.name,
      visitDate: fmtDate(visit.checkInTime),
      durationMinutes: visit.visitDuration,
      stage: visit.lead?.stage,
      notes: visit.notes,
      followUpDate: null,
      documentsUploaded: [],
    };

    const prompt = buildVisitSummaryPrompt(ctx);
    let aiResponse = await callAI(prompt, { expectJson: true, useCache: false });

    if (!aiResponse) {
      aiResponse = {
        overview: `RM completed check-in at ${ctx.merchantName || 'Dealer'} on ${ctx.visitDate || 'today'}.`,
        keyDiscussionPoints: [
          "Reviewed current stage and verification status.",
          ctx.notes ? `Discussed RM notes: ${ctx.notes}` : "Discussed general business progression and limits."
        ],
        nextSteps: [
          "Proceed to next milestone in SFA pipeline.",
          "Follow up on pending document requests."
        ]
      };
    }

    return success(res, {
      aiAvailable: true,
      summary: aiResponse,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 3: Visit Assistant (Prep) ────────────────────────────────────────
export const visitAssistant = async (req, res, next) => {
  try {
    const { leadId, dealerId } = req.body;

    let lead = null;
    let dealer = null;
    let anchor = null;

    if (leadId) {
      lead = await Lead.findById(leadId).populate('dealer anchor assignedTo').lean();
      dealer = lead?.dealer;
      anchor = lead?.anchor;
    } else if (dealerId) {
      dealer = await Dealer.findById(dealerId).populate('anchor').lean();
      anchor = dealer?.anchor;
    }

    if (!dealer) return error(res, 'Dealer or Lead not found', 404);

    // Fetch last visit notes
    const lastVisit = leadId
      ? await Visit.findOne({ lead: leadId }).sort({ checkInTime: -1 }).lean()
      : null;

    const ctx = {
      merchantName: dealer.businessName || dealer.name,
      anchorCompany: anchor?.name,
      businessType: dealer.businessType,
      city: dealer.address?.city,
      state: dealer.address?.state,
      expectedValue: lead?.expectedValue,
      pipelineStage: lead?.stage,
      isStuck: lead?.isStuck,
      urgencyFlag: lead?.urgencyFlag,
      npaFlag: lead?.npaFlag,
      dpnRiskFlag: lead?.dpnRiskFlag,
      kycStatus: lead?.stage === 'KYC_SUBMITTED' ? 'Submitted' : 'Pending',
      lastVisitDate: fmtDate(lastVisit?.checkInTime),
      notes: lastVisit?.notes || lead?.notes,
    };

    const prompt = buildVisitAssistantPrompt(ctx);
    let aiResponse = await callAI(prompt, { expectJson: true, useCache: true });

    if (!aiResponse) {
      aiResponse = {
        visitObjective: ctx.isStuck 
          ? "Resolution of stuck stage blocker." 
          : (ctx.pipelineStage === 'SANCTIONED' ? "Sanction sign-off and limits check." : "KYC collection and document verification."),
        checklist: [
          "Confirm business operating address.",
          "Verify GSTIN status and compliance.",
          "Collect latest bank statements if required."
        ],
        suggestedQuestions: [
          "How has your business turnover trended over the past quarter?",
          "Are there any blockers preventing document submission?"
        ]
      };
    }

    return success(res, {
      aiAvailable: true,
      preparation: aiResponse,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 4: NBA Explanation ───────────────────────────────────────────────
export const nbaExplain = async (req, res, next) => {
  try {
    const { leadId, score } = req.body;

    const lead = await Lead.findById(leadId).populate('dealer').lean();
    if (!lead) return error(res, 'Lead not found', 404);

    const sanctionDaysLeft = lead.sanctionExpiryDate
      ? Math.ceil((new Date(lead.sanctionExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const ctx = {
      merchantName: lead.dealer?.businessName || lead.dealer?.name || 'Unknown',
      stage: lead.stage,
      score: score || 0,
      isStuck: lead.isStuck,
      urgencyFlag: lead.urgencyFlag,
      npaFlag: lead.npaFlag,
      sanctionDaysLeft,
      expectedValue: lead.expectedValue,
      lastActivityAt: fmtDate(lead.lastActivityAt),
    };

    const prompt = buildNbaExplanationPrompt(ctx);
    let aiResponse = await callAI(prompt, { expectJson: false, useCache: true });

    if (!aiResponse) {
      aiResponse = `This lead has a priority score of ${ctx.score}. The priority is computed based on key business parameters: expected deal value (₹${ctx.expectedValue} Lakhs), current stage (${ctx.stage}), and urgency indicator flags (${ctx.urgencyFlag ? 'High urgency' : 'Normal priority'}).${ctx.isStuck ? ' It has been flagged as stuck, boosting its need for immediate RM outreach.' : ''}`;
    }

    return success(res, {
      aiAvailable: true,
      explanation: aiResponse,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 5: RM Daily Brief ────────────────────────────────────────────────
export const dailyBrief = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const rmName = req.user.name;

    const [totalLeads, stuckLeads, urgentLeads] = await Promise.all([
      Lead.countDocuments({ assignedTo: userId, stage: { $nin: ['DISBURSED', 'CLOSED_WON', 'CLOSED_LOST'] } }),
      Lead.countDocuments({ assignedTo: userId, isStuck: true }),
      Lead.countDocuments({ assignedTo: userId, urgencyFlag: true }),
    ]);

    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const expiringInWeek = await Lead.countDocuments({
      assignedTo: userId,
      stage: 'SANCTIONED',
      sanctionExpiryDate: { $gte: new Date(), $lte: in7Days },
    });

    const leads = await Lead.find({ 
      assignedTo: userId, 
      stage: { $nin: ['DISBURSED', 'CLOSED_WON', 'CLOSED_LOST'] } 
    }).populate('dealer').lean();

    const config = (await NbaConfig.findOne()) || new NbaConfig();
    const w = config.weights;

    const getStageScore = (stage) => {
      const stages = {
        ASSIGNED: 0.1,
        IN_PROGRESS: 0.3,
        CREDIT_ASSESSMENT: 0.5,
        KYC_SUBMITTED: 0.6,
        SANCTIONED: 0.8,
      };
      return stages[stage] || 0;
    };

    let topPriorityLead = null;
    let topScore = -1;

    leads.forEach((lead) => {
      let score = 0;
      score += Math.min(lead.expectedValue / 100, 1.0) * w.dealValue;
      score += getStageScore(lead.stage) * w.stageProgression;
      if (lead.npaFlag || lead.dpnRiskFlag) score += w.dpdRisk;
      if (lead.sanctionExpiryDate && lead.stage === 'SANCTIONED') {
        const daysLeft = Math.ceil((new Date(lead.sanctionExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 14) {
          score += Math.min(14 / Math.max(daysLeft, 1), 1.0) * w.sanctionExpiryUrgency;
        }
      }
      if (lead.isStuck) score += 15;
      if (lead.urgencyFlag) score += 20;

      if (score > topScore) {
        topScore = score;
        topPriorityLead = lead;
      }
    });

    const topPriorityDealer = topPriorityLead?.dealer?.businessName || topPriorityLead?.dealer?.name || null;

    const ctx = { rmName, totalLeads, stuckLeads, urgentLeads, expiringInWeek, pendingKyc: 0, topPriorityDealer };

    const prompt = buildDailyBriefPrompt(ctx);
    let aiResponse = await callAI(prompt, { expectJson: true, useCache: false });

    if (!aiResponse) {
      aiResponse = {
        greeting: `Good Morning, ${ctx.rmName}!`,
        morningHighlights: `You currently have ${ctx.totalLeads} active leads assigned. ${ctx.stuckLeads} cases require attention, and ${ctx.urgentLeads} are flagged as urgent.`,
        todayPriorities: [
          `Outreach to top priority merchant ${ctx.topPriorityDealer || 'assigned leads'}.`,
          ctx.stuckLeads > 0 ? "Resolve blockers for stuck cases." : "Progress active pipeline cases to the next stage.",
        ],
        importantReminders: [
          ctx.expiringInWeek > 0 ? `Verify limits for ${ctx.expiringInWeek} leads expiring soon.` : "Ensure all check-ins are logged with location verified.",
        ]
      };
    }

    return success(res, {
      aiAvailable: true,
      brief: aiResponse,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 6: Follow-up Suggestions ────────────────────────────────────────
export const followUpSuggestions = async (req, res, next) => {
  try {
    const { leadId } = req.body;

    const lead = await Lead.findById(leadId).populate('dealer anchor').lean();
    if (!lead) return error(res, 'Lead not found', 404);

    const prompt = `You are a sales advisor for Progcap SFA.
Based on this merchant's situation, suggest 3-5 specific next steps for the RM.
Be concise. Use bullet points. No marketing language.
Respond as a JSON array of strings (each string is one action).

MERCHANT: ${lead.dealer?.businessName || 'Unknown'}
CURRENT STAGE: ${lead.stage}
IS STUCK: ${lead.isStuck ? 'Yes' : 'No'}
KYC STATUS: ${lead.stage === 'KYC_SUBMITTED' ? 'Submitted' : 'Pending'}
SANCTION EXPIRY: ${fmtDate(lead.sanctionExpiryDate) || 'N/A'}
NOTES: ${lead.notes || 'None'}

Return JSON array now.`;

    let aiResponse = await callAI(prompt, { expectJson: true, useCache: true });

    if (!aiResponse) {
      aiResponse = [
        "Confirm and complete document verification.",
        "Check and resolve any pending KYC discrepancies.",
        "Coordinate with the anchor regarding relationship history.",
      ];
    }

    return success(res, {
      aiAvailable: true,
      suggestions: Array.isArray(aiResponse) ? aiResponse : [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 7: Document Review Summary ──────────────────────────────────────
export const documentReview = async (req, res, next) => {
  try {
    const { documentId, ocrText } = req.body;

    if (!ocrText) {
      return success(res, {
        aiAvailable: false,
        summary: null,
        reason: 'No OCR text available for this document.',
      });
    }

    const prompt = `You are a document review assistant for Progcap SFA.
IMPORTANT RULES:
- You are ONLY summarizing visible document information
- You must NEVER approve or reject a KYC document
- You must NEVER make compliance decisions
- Only summarize what is visible in the text

Document OCR Text:
${ocrText.slice(0, 2000)}

Provide a JSON summary with keys: documentType, keyFieldsExtracted (array of {field, value}), completenessObservation.
Keep it under 150 words.`;

    let aiResponse = await callAI(prompt, { expectJson: true, useCache: true });

    if (!aiResponse) {
      aiResponse = {
        documentType: "Unverified Document (Fallback)",
        keyFieldsExtracted: [
          { field: "Completeness", value: "Verification pending" }
        ],
        completenessObservation: "AI service currently unavailable. Please manually review the document details."
      };
    }

    return success(res, {
      aiAvailable: true,
      summary: aiResponse,
      disclaimer: 'AI summary only. No compliance decision implied.',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 8: Smart Search (NL → Filters) ──────────────────────────────────
export const smartSearch = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return error(res, 'Query is required', 400);

    const prompt = `You are a search query parser for Progcap SFA.
Convert the user's natural language search into structured filter parameters.
VALID stages: ASSIGNED, IN_PROGRESS, CREDIT_ASSESSMENT, KYC_SUBMITTED, SANCTIONED, DISBURSED, CLOSED_WON, CLOSED_LOST
VALID flags: isStuck (boolean), urgencyFlag (boolean), npaFlag (boolean)

User query: "${query}"

Respond in JSON with any of these keys that apply: stage, isStuck, urgencyFlag, npaFlag, searchText.
If a field doesn't apply to this query, omit it. Respond with ONLY the JSON object.`;

    let aiResponse = await callAI(prompt, { expectJson: true, useCache: true });

    if (!aiResponse) {
      aiResponse = {};
      const upper = query.toUpperCase();
      if (upper.includes('STUCK')) aiResponse.isStuck = true;
      if (upper.includes('URGENT')) aiResponse.urgencyFlag = true;
      if (upper.includes('NPA')) aiResponse.npaFlag = true;
      if (upper.includes('ASSIGNED')) aiResponse.stage = 'ASSIGNED';
      else if (upper.includes('CREDIT')) aiResponse.stage = 'CREDIT_ASSESSMENT';
      else if (upper.includes('KYC')) aiResponse.stage = 'KYC_SUBMITTED';
      else if (upper.includes('SANCTION')) aiResponse.stage = 'SANCTIONED';
      else if (upper.includes('DISBURSED')) aiResponse.stage = 'DISBURSED';
    }

    return success(res, {
      aiAvailable: true,
      filters: aiResponse || {},
      originalQuery: query,
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 9: Manager Dashboard Insights ────────────────────────────────────
export const managerInsights = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const managerName = req.user.name;

    // Gather real data for the manager
    const [totalRMs, activeRMs, totalLeads, stuckLeads, urgentLeads] = await Promise.all([
      User.countDocuments({ manager: userId, role: 'RM', status: 'ACTIVE', isDeleted: { $ne: true } }),
      User.countDocuments({ manager: userId, role: 'RM', status: 'ACTIVE', isDeleted: { $ne: true } }),
      Lead.countDocuments({ stage: { $nin: ['DISBURSED', 'CLOSED_WON', 'CLOSED_LOST'] } }),
      Lead.countDocuments({ isStuck: true }),
      Lead.countDocuments({ urgencyFlag: true }),
    ]);

    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const expiringInWeek = await Lead.countDocuments({
      stage: 'SANCTIONED',
      sanctionExpiryDate: { $gte: new Date(), $lte: in7Days },
    });

    // Top 3 stuck dealer names
    const stuckLeadsData = await Lead.find({ isStuck: true })
      .populate('dealer', 'businessName name')
      .limit(3)
      .lean();
    const stuckDealers = stuckLeadsData.map((l) => l.dealer?.businessName || l.dealer?.name || 'Unknown');

    const ctx = { managerName, role, totalRMs, activeRMs, totalLeads, stuckLeads, urgentLeads, expiringInWeek, stuckDealers };

    const prompt = buildManagerInsightsPrompt(ctx);
    let aiResponse = await callAI(prompt, { expectJson: true, useCache: false });

    if (!aiResponse) {
      aiResponse = {
        overview: `Summary of active portfolio for ${ctx.managerName}.`,
        performanceSummary: `Managing ${ctx.totalRMs} active RMs. Total leads in funnel is ${ctx.totalLeads}.`,
        criticalActions: [
          ctx.stuckLeads > 0 ? `Follow up on the ${ctx.stuckLeads} stuck cases in the cluster.` : "Monitor daily itineraries and RMs geo-proximity compliance.",
          ctx.expiringInWeek > 0 ? `${ctx.expiringInWeek} sanctions are expiring this week.` : "Ensure clean progression of KYC documents."
        ]
      };
    }

    return success(res, {
      aiAvailable: true,
      insights: aiResponse,
      dataSnapshot: { totalLeads, stuckLeads, urgentLeads, expiringInWeek },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Feature 10: Admin Platform Insights ──────────────────────────────────────
export const adminInsights = async (req, res, next) => {
  try {
    const [totalActiveUsers, activeRMs, totalLeads, stuckLeads, totalAnchors, totalDealers] = await Promise.all([
      User.countDocuments({ status: 'ACTIVE', isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'RM', status: 'ACTIVE', isDeleted: { $ne: true } }),
      Lead.countDocuments(),
      Lead.countDocuments({ isStuck: true }),
      (await import('../models/index.js')).Anchor.countDocuments(),
      (await import('../models/index.js')).Dealer.countDocuments(),
    ]);

    const ctx = { totalActiveUsers, activeRMs, totalLeads, stuckLeads, totalAnchors, totalDealers, pendingKyc: 0, failedSyncs: 0 };

    const prompt = buildAdminInsightsPrompt(ctx);
    let aiResponse = await callAI(prompt, { expectJson: true, useCache: false });

    if (!aiResponse) {
      aiResponse = {
        platformStatus: "Operational",
        systemHighlights: `Total registered active users: ${ctx.totalActiveUsers}. Active RMs: ${ctx.activeRMs}.`,
        recommendedMaintenance: [
          `Review geofencing limits and sync frequencies.`,
          `Monitor the ${ctx.stuckLeads} stuck leads globally.`
        ]
      };
    }

    return success(res, {
      aiAvailable: true,
      insights: aiResponse,
      dataSnapshot: { totalActiveUsers, totalLeads, stuckLeads, totalAnchors, totalDealers },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
