import { Anchor, Dealer } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { paginateQuery, buildPagination } from '../utils/pagination.js';
import { createAuditLog } from '../utils/audit.js';

export const getAnchors = async (req, res, next) => {
  try {
    const { status, cluster } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (cluster) filter.clusters = cluster;

    const options = buildPagination(req.query);
    const result = await paginateQuery(Anchor, filter, options, 'clusters');

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const createAnchor = async (req, res, next) => {
  try {
    if (!req.body.code && req.body.name) {
      req.body.code = req.body.name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_' + Math.floor(1000 + Math.random() * 9000);
    }
    const anchor = await Anchor.create(req.body);
    await createAuditLog(req.user._id, req.user.role, 'CREATE_ANCHOR', 'Anchor', anchor._id, null, anchor, req);
    return success(res, anchor, 'Anchor created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getAnchorById = async (req, res, next) => {
  try {
    const anchor = await Anchor.findById(req.params.id).lean();
    if (!anchor) return error(res, 'Anchor not found', 404);

    const dealerCount = await Dealer.countDocuments({ anchor: anchor._id });
    
    return success(res, { ...anchor, dealerCount });
  } catch (err) {
    next(err);
  }
};

export const updateAnchor = async (req, res, next) => {
  try {
    const anchor = await Anchor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!anchor) return error(res, 'Anchor not found', 404);
    await createAuditLog(req.user._id, req.user.role, 'UPDATE_ANCHOR', 'Anchor', anchor._id, null, anchor, req);
    return success(res, anchor, 'Anchor updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteAnchor = async (req, res, next) => {
  try {
    const anchor = await Anchor.findByIdAndUpdate(req.params.id, { status: 'INACTIVE' }, { new: true });
    if (!anchor) return error(res, 'Anchor not found', 404);
    await createAuditLog(req.user._id, req.user.role, 'DELETE_ANCHOR', 'Anchor', anchor._id, null, anchor, req);
    return success(res, {}, 'Anchor deleted successfully');
  } catch (err) {
    next(err);
  }
};
