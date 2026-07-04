import { Visit, Dealer, GeofenceConfig, Lead } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { buildPagination, paginateQuery } from '../utils/pagination.js';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

export const checkIn = async (req, res, next) => {
  try {
    const { leadId, dealerId, latitude, longitude, photos, bypassReason } = req.body;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) return error(res, 'Dealer not found', 404);

    const config = await GeofenceConfig.findOne();
    const defaultRadius = config?.defaultRadiusMeters || 100;
    
    let radius = defaultRadius;
    if (config && config.overrides) {
      const override = config.overrides.find(o => o.dealer.toString() === dealerId);
      if (override) radius = override.radiusMeters;
    }

    let geofenceStatus = 'VALID';
    if (dealer.location && Array.isArray(dealer.location.coordinates) && dealer.location.coordinates.length === 2) {
      const distance = calculateDistance(
        latitude, longitude,
        dealer.location.coordinates[1], dealer.location.coordinates[0]
      );
      if (distance > radius) {
        geofenceStatus = bypassReason ? 'BYPASSED' : 'VIOLATED';
      }
    } else {
      // If dealer has no location, we can't verify geofence
      geofenceStatus = 'VALID'; 
    }

    if (geofenceStatus === 'VIOLATED') {
      return error(res, 'Check-in location is outside the allowed geofence area.', 403);
    }

    const visit = await Visit.create({
      lead: leadId,
      rm: req.user._id,
      dealer: dealerId,
      checkInLocation: { type: 'Point', coordinates: [longitude, latitude] },
      checkInTime: new Date(),
      geofenceStatus,
      photos,
      notes: bypassReason ? `Bypass Reason: ${bypassReason}` : ''
    });

    // Update lead last activity and advance stage from ASSIGNED to IN_PROGRESS
    const lead = await Lead.findById(leadId);
    if (lead) {
      lead.lastActivityAt = new Date();
      if (lead.stage === 'ASSIGNED') {
        lead.stage = 'IN_PROGRESS';
      }
      await lead.save();
    }

    return success(res, visit, 'Checked in successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const visit = await Visit.findOne({
      _id: req.params.id,
      rm: req.user._id,
      checkOutTime: { $exists: false }
    });

    if (!visit) {
      return error(res, 'Active check-in not found', 404);
    }

    const checkOutTime = new Date();
    const visitDuration = Math.round((checkOutTime - visit.checkInTime) / 60000); // in minutes

    visit.checkOutTime = checkOutTime;
    visit.visitDuration = visitDuration;
    if (notes) {
      visit.notes = visit.notes ? `${visit.notes}\n${notes}` : notes;
    }
    
    await visit.save();
    
    // Update lead last activity
    await Lead.findByIdAndUpdate(visit.lead, { lastActivityAt: new Date() });

    return success(res, visit, 'Checked out successfully');
  } catch (err) {
    next(err);
  }
};

export const getVisits = async (req, res, next) => {
  try {
    const { leadId, rmId, dateRange } = req.query;
    const filter = {};
    if (leadId) filter.lead = leadId;
    if (rmId) filter.rm = rmId;

    if (dateRange) {
      const [start, end] = dateRange.split(',');
      filter.checkInTime = { $gte: new Date(start), $lte: new Date(end) };
    }

    const options = buildPagination(req.query);
    const result = await paginateQuery(Visit, filter, options, 'rm lead dealer');

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const configureGeofence = async (req, res, next) => {
  try {
    const { defaultRadiusMeters, overrides } = req.body;
    
    let config = await GeofenceConfig.findOne();
    if (!config) {
      config = new GeofenceConfig();
    }

    if (defaultRadiusMeters) config.defaultRadiusMeters = defaultRadiusMeters;
    if (overrides) config.overrides = overrides;
    config.updatedBy = req.user._id;

    await config.save();

    return success(res, config, 'Geofence config updated');
  } catch (err) {
    next(err);
  }
};
