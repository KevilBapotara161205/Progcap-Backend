import { Lead, NbaConfig } from '../models/index.js';
import { success, error } from '../utils/response.js';

// Helper to calculate distance in meters using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const getInsights = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { latitude, longitude } = req.query;
    const clientLat = latitude ? parseFloat(latitude) : null;
    const clientLon = longitude ? parseFloat(longitude) : null;

    // Fetch leads for this RM, populating full dealer object to get coordinates
    const leads = await Lead.find({ assignedTo: userId })
      .populate('dealer')
      .lean();

    const insights = [];

    const config = (await NbaConfig.findOne()) || new NbaConfig();
    const w = config.weights;

    // Helper to calculate stage score
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

    leads.forEach((lead) => {
      const dealer = lead.dealer;
      if (!dealer) return;

      const dealerName = dealer.businessName || dealer.name || 'Unknown Dealer';
      let totalScore = 0;
      let insightType = 'INFO';

      // 1. Deal Value Score (Max value 100 Lakhs = 1Cr -> 1.0)
      const valScore = Math.min(lead.expectedValue / 100, 1.0) * w.dealValue;
      totalScore += valScore;

      // 2. Stage Progression Score
      const stageScore = getStageScore(lead.stage) * w.stageProgression;
      totalScore += stageScore;

      // 3. DPD/NPA Risk Score
      if (lead.npaFlag || lead.dpnRiskFlag) {
        totalScore += w.dpdRisk;
      }

      // 4. Sanction Expiry Score
      if (lead.sanctionExpiryDate && lead.stage === 'SANCTIONED') {
        const daysLeft = Math.ceil(
          (new Date(lead.sanctionExpiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft > 0 && daysLeft <= 14) {
          const expiryScore =
            Math.min(14 / Math.max(daysLeft, 1), 1.0) * w.sanctionExpiryUrgency;
          totalScore += expiryScore;
          if (daysLeft <= 3) insightType = 'DANGER';
        }
      }

      // 5. Stuck Lead penalty/boost
      if (lead.isStuck) {
        totalScore += 15; // Boost priority to get it unstuck
        insightType = 'WARNING';
      }

      if (lead.urgencyFlag) {
        totalScore += 20;
        insightType = 'DANGER';
      }

      // 6. Geo-proximity Score (Feature 4 Proximity Ranking)
      let distanceMeters = null;
      if (
        clientLat !== null &&
        clientLon !== null &&
        dealer.location &&
        Array.isArray(dealer.location.coordinates) &&
        dealer.location.coordinates.length === 2
      ) {
        const dealerLon = dealer.location.coordinates[0];
        const dealerLat = dealer.location.coordinates[1];
        distanceMeters = calculateDistance(clientLat, clientLon, dealerLat, dealerLon);

        // Score boost: higher score for closer merchants, up to 15km max threshold
        const maxDistance = 15000;
        const proximityBoost =
          ((maxDistance - Math.min(distanceMeters, maxDistance)) / maxDistance) *
          w.geoProximity;
        totalScore += proximityBoost;
      }

      // Generate insight card text based on highest contributing factor
      let title = `Priority: ${lead.stage.replace('_', ' ')}`;
      let desc = `Follow up with ${dealerName} to move deal forward.`;

      if (lead.isStuck) {
        title = 'Stuck Deal Alert';
        desc = `${dealerName} has been stuck in ${lead.stage.replace(
          '_',
          ' '
        )}. Action required to unblock.`;
      } else if (lead.sanctionExpiryDate && lead.stage === 'SANCTIONED') {
        const daysLeft = Math.ceil(
          (new Date(lead.sanctionExpiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 14) {
          title = 'Sanction Expiring Soon';
          desc = `${dealerName}'s sanction expires in ${daysLeft} days. Expedite disbursement.`;
        }
      } else if (lead.expectedValue >= 20) {
        title = 'High Value Opportunity';
        desc = `${dealerName} has a potential ₹${(lead.expectedValue).toFixed(
          1
        )}L deal. Prioritize this.`;
        if (insightType !== 'DANGER' && insightType !== 'WARNING') insightType = 'SUCCESS';
      } else if (lead.dpnRiskFlag) {
        title = 'DPD Risk Warning';
        desc = `${dealerName} has flagged DPD risk. Visit to assess stability.`;
        insightType = 'WARNING';
      }

      // Append distance details to description for clarity if location was provided
      if (distanceMeters !== null) {
        const distanceKm = (distanceMeters / 1000).toFixed(1);
        desc += ` (${distanceKm} km away)`;
      }

      // Only add to NBA if it's active
      if (
        lead.stage !== 'DISBURSED' &&
        lead.stage !== 'CLOSED_WON' &&
        lead.stage !== 'CLOSED_LOST'
      ) {
        insights.push({
          id: `nba_${lead._id}`,
          title: title,
          description: desc,
          type: insightType,
          actionText: 'Take Action',
          leadId: lead._id,
          dealerId: dealer._id,
          dealerName: dealerName,
          stage: lead.stage,
          expectedValue: lead.expectedValue,
          nbaStatus: lead.nbaStatus || 'PENDING',
          nbaNotes: lead.nbaNotes || '',
          kycCompleted: lead.kycCompleted || false,
          _score: totalScore, // internal sorting
        });
      }
    });

    // Sort by calculated score descending
    insights.sort((a, b) => b._score - a._score);

    // Remove internal score from response
    const finalInsights = insights.map(({ _score, ...rest }) => rest);

    return success(res, finalInsights);
  } catch (err) {
    next(err);
  }
};

export const completeNba = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { notes } = req.body;

    const lead = await Lead.findOne({ _id: leadId, assignedTo: req.user._id });
    if (!lead) {
      return error(res, 'Lead not found or unassigned', 404);
    }

    lead.nbaStatus = 'COMPLETED';
    if (notes) {
      lead.nbaNotes = notes;
    }
    
    await lead.save();

    return success(res, lead, 'NBA marked as completed');
  } catch (err) {
    next(err);
  }
};

export const checkinNba = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    
    const lead = await Lead.findOne({ _id: leadId, assignedTo: req.user._id });
    if (!lead) {
      return error(res, 'Lead not found or unassigned', 404);
    }
    
    lead.nbaStatus = 'IN_PROGRESS';
    await lead.save();
    
    return success(res, lead, 'NBA checked in and marked as in-progress');
  } catch (err) {
    next(err);
  }
};
