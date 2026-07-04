import bcrypt from 'bcryptjs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { User, Territory } from '../models/index.js';
import { success, error } from '../utils/response.js';
import { paginateQuery, buildPagination } from '../utils/pagination.js';
import { createAuditLog } from '../utils/audit.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role, status, territory } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (territory) filter.territory = territory;
    
    // Do not return soft-deleted users
    filter.isDeleted = { $ne: true };

    const options = buildPagination(req.query);
    const result = await paginateQuery(User, filter, options, 'territory manager');

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, territory, manager, password } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return error(res, 'User with this phone already exists', 400);
    }

    let passwordHash = undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const user = await User.create({
      name,
      email,
      phone,
      role,
      territory,
      manager,
      passwordHash,
      status: 'ACTIVE'
    });

    await createAuditLog(req.user._id, req.user.role, 'CREATE_USER', 'User', user._id, null, user, req);

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return success(res, userObj, 'User created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('territory manager');
    if (!user) {
      return error(res, 'User not found', 404);
    }

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return success(res, userObj);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return error(res, 'User not found', 404);
    }

    const previousValue = user.toObject();
    const allowedFields = ['name', 'email', 'role', 'status', 'territory', 'manager'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();
    
    await createAuditLog(req.user._id, req.user.role, 'UPDATE_USER', 'User', user._id, previousValue, user, req);

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return success(res, userObj, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      return error(res, 'User not found', 404);
    }

    const previousValue = user.toObject();
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    await createAuditLog(req.user._id, req.user.role, 'DELETE_USER', 'User', user._id, previousValue, user, req);

    return success(res, {}, 'User soft deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const bulkImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 'Please upload a CSV file', 400);
    }

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let created = 0;
        let updated = 0;
        const errors = [];

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          try {
            if (!row.phone || !row.name) {
              errors.push({ row: i + 2, reason: 'Missing required fields (phone/name)' });
              continue;
            }

            let user = await User.findOne({ phone: row.phone });
            
            const territory = row.territoryCode ? await Territory.findOne({ code: row.territoryCode }) : null;

            if (user) {
              user.name = row.name || user.name;
              user.email = row.email || user.email;
              user.role = row.role || user.role;
              if (territory) user.territory = territory._id;
              await user.save();
              updated++;
            } else {
              await User.create({
                name: row.name,
                phone: row.phone,
                email: row.email,
                role: row.role || 'RM',
                status: 'ACTIVE',
                territory: territory ? territory._id : undefined
              });
              created++;
            }
          } catch (err) {
            errors.push({ row: i + 2, reason: err.message });
          }
        }

        return success(res, { created, updated, errors }, 'Bulk import processed');
      });
  } catch (err) {
    next(err);
  }
};
