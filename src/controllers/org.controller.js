import { Region, Cluster, Territory } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { createAuditLog } from '../utils/audit.js';

// --- Regions ---
export const getRegions = async (req, res, next) => {
  try {
    const regions = await Region.find({ status: 'ACTIVE' });
    return success(res, regions);
  } catch (err) {
    next(err);
  }
};

export const createRegion = async (req, res, next) => {
  try {
    const region = await Region.create(req.body);
    await createAuditLog(req.user._id, req.user.role, 'CREATE_REGION', 'Region', region._id, null, region, req);
    return success(res, region, 'Region created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateRegion = async (req, res, next) => {
  try {
    const region = await Region.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!region) return error(res, 'Region not found', 404);
    await createAuditLog(req.user._id, req.user.role, 'UPDATE_REGION', 'Region', region._id, null, region, req);
    return success(res, region, 'Region updated successfully');
  } catch (err) {
    next(err);
  }
};

// --- Clusters ---
export const getClusters = async (req, res, next) => {
  try {
    const clusters = await Cluster.find({ status: 'ACTIVE' }).populate('region manager');
    return success(res, clusters);
  } catch (err) {
    next(err);
  }
};

export const createCluster = async (req, res, next) => {
  try {
    const cluster = await Cluster.create(req.body);
    await createAuditLog(req.user._id, req.user.role, 'CREATE_CLUSTER', 'Cluster', cluster._id, null, cluster, req);
    return success(res, cluster, 'Cluster created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateCluster = async (req, res, next) => {
  try {
    const cluster = await Cluster.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cluster) return error(res, 'Cluster not found', 404);
    await createAuditLog(req.user._id, req.user.role, 'UPDATE_CLUSTER', 'Cluster', cluster._id, null, cluster, req);
    return success(res, cluster, 'Cluster updated successfully');
  } catch (err) {
    next(err);
  }
};

// --- Territories ---
export const getTerritories = async (req, res, next) => {
  try {
    const filter = { status: 'ACTIVE' };
    if (req.query.cluster) filter.cluster = req.query.cluster;
    
    const territories = await Territory.find(filter).populate('cluster rm');
    return success(res, territories);
  } catch (err) {
    next(err);
  }
};

export const createTerritory = async (req, res, next) => {
  try {
    const territory = await Territory.create(req.body);
    await createAuditLog(req.user._id, req.user.role, 'CREATE_TERRITORY', 'Territory', territory._id, null, territory, req);
    return success(res, territory, 'Territory created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateTerritory = async (req, res, next) => {
  try {
    const territory = await Territory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!territory) return error(res, 'Territory not found', 404);
    await createAuditLog(req.user._id, req.user.role, 'UPDATE_TERRITORY', 'Territory', territory._id, null, territory, req);
    return success(res, territory, 'Territory updated successfully');
  } catch (err) {
    next(err);
  }
};

// --- Hierarchy ---
export const getHierarchy = async (req, res, next) => {
  try {
    const hierarchy = await Region.aggregate([
      { $match: { status: 'ACTIVE' } },
      {
        $lookup: {
          from: 'clusters',
          localField: '_id',
          foreignField: 'region',
          as: 'clusters'
        }
      },
      { $unwind: { path: '$clusters', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'territories',
          localField: 'clusters._id',
          foreignField: 'cluster',
          as: 'clusters.territories'
        }
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          code: { $first: '$code' },
          clusters: { $push: '$clusters' }
        }
      }
    ]);
    
    return success(res, hierarchy);
  } catch (err) {
    next(err);
  }
};
