import axios from 'axios';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Dealer } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { paginateQuery, buildPagination } from '../utils/pagination.js';
import { createAuditLog } from '../utils/audit.js';
import { GOOGLE_MAPS_API_KEY } from '../config/env.js';

export const getDealers = async (req, res, next) => {
  try {
    const { anchorId } = req.params;
    const { cluster, territory, status } = req.query;
    
    const filter = { anchor: anchorId };
    if (cluster) filter.cluster = cluster;
    if (territory) filter.territory = territory;
    if (status) filter.status = status;

    const options = buildPagination(req.query);
    const result = await paginateQuery(Dealer, filter, options, 'cluster territory');

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const createDealer = async (req, res, next) => {
  try {
    const { anchorId } = req.params;
    const dealerData = { ...req.body, anchor: anchorId };
    
    const dealer = await Dealer.create(dealerData);
    await createAuditLog(req.user._id, req.user.role, 'CREATE_DEALER', 'Dealer', dealer._id, null, dealer, req);
    
    return success(res, dealer, 'Dealer created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getDealerById = async (req, res, next) => {
  try {
    const dealer = await Dealer.findOne({ _id: req.params.id, anchor: req.params.anchorId });
    if (!dealer) return error(res, 'Dealer not found', 404);
    return success(res, dealer);
  } catch (err) {
    next(err);
  }
};

export const updateDealer = async (req, res, next) => {
  try {
    const dealer = await Dealer.findOneAndUpdate(
      { _id: req.params.id, anchor: req.params.anchorId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!dealer) return error(res, 'Dealer not found', 404);
    await createAuditLog(req.user._id, req.user.role, 'UPDATE_DEALER', 'Dealer', dealer._id, null, dealer, req);
    return success(res, dealer, 'Dealer updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteDealer = async (req, res, next) => {
  try {
    const dealer = await Dealer.findOneAndUpdate(
      { _id: req.params.id, anchor: req.params.anchorId },
      { status: 'INACTIVE' },
      { new: true }
    );
    if (!dealer) return error(res, 'Dealer not found', 404);
    await createAuditLog(req.user._id, req.user.role, 'DELETE_DEALER', 'Dealer', dealer._id, null, dealer, req);
    return success(res, {}, 'Dealer deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const searchDealers = async (req, res, next) => {
  try {
    const { anchorId } = req.params;
    const { q } = req.query;
    
    const filter = { anchor: anchorId, status: 'ACTIVE' };
    if (q) {
      filter.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { ownerName: { $regex: q, $options: 'i' } }
      ];
    }

    const dealers = await Dealer.find(filter)
      .select('_id businessName ownerName address gstNumber phone location')
      .limit(10);
      
    return success(res, dealers);
  } catch (err) {
    next(err);
  }
};

export const bulkImportDealers = async (req, res, next) => {
  try {
    const { anchorId } = req.params;
    if (!req.file) return error(res, 'Please upload a CSV file', 400);

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          try {
            if (!row.businessName) {
              errors.push({ row: i + 2, reason: 'Missing required field (businessName)' });
              continue;
            }

            const searchFilter = row.gstNumber ? { gstNumber: row.gstNumber } : { phone: row.phone };
            if (!searchFilter.gstNumber && !searchFilter.phone) {
              errors.push({ row: i + 2, reason: 'Must provide either gstNumber or phone for matching' });
              continue;
            }

            const exists = await Dealer.findOne({ anchor: anchorId, ...searchFilter });
            if (exists) {
              skipped++;
              continue;
            }

            let coordinates = [0, 0];
            if (row.latitude && row.longitude) {
              coordinates = [parseFloat(row.longitude), parseFloat(row.latitude)];
            } else if (GOOGLE_MAPS_API_KEY && row.street) {
              const address = `${row.street}, ${row.city}, ${row.state} ${row.pincode}`;
              const gcRes = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                params: { address, key: GOOGLE_MAPS_API_KEY }
              });
              if (gcRes.data.status === 'OK' && gcRes.data.results.length > 0) {
                const loc = gcRes.data.results[0].geometry.location;
                coordinates = [loc.lng, loc.lat];
              }
            }

            const dealerData = {
              anchor: anchorId,
              businessName: row.businessName,
              ownerName: row.ownerName,
              businessType: row.businessType,
              address: {
                street: row.street,
                city: row.city,
                state: row.state,
                pincode: row.pincode
              },
              location: { type: 'Point', coordinates },
              gstNumber: row.gstNumber,
              panNumber: row.panNumber,
              phone: row.phone,
              email: row.email
            };

            await Dealer.create(dealerData);
            imported++;
          } catch (err) {
            errors.push({ row: i + 2, reason: err.message });
          }
        }

        return success(res, { imported, skipped, errors }, 'Bulk import processed');
      });
  } catch (err) {
    next(err);
  }
};
