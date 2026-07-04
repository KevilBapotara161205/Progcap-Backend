import { verifyAccessToken } from '../services/jwt.service.js';
import { User } from '../models/index.js';
import { error } from '../utils/response.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return error(res, 'Not authorized to access this route', 401);
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return error(res, 'User no longer exists', 401);
    }

    if (user.status !== 'ACTIVE') {
      if (user.role === 'SUPER_ADMIN') {
        user.status = 'ACTIVE';
        await user.save();
      } else {
        return error(res, 'User account is inactive', 403);
      }
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return error(res, 'You do not have permission to perform this action', 403);
    }
    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      if (user && user.status === 'ACTIVE') {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    next(); // Don't block on error for optional auth
  }
};
