import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import * as otpService from '../services/otp.service.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/jwt.service.js';
import { success, error } from '../utils/response.js';

export const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    
    // Check if user exists before sending OTP
    const user = await User.findOne({ phone });
    if (!user) {
      return error(res, 'User does not exist', 404);
    }
    if (user.status !== 'ACTIVE') {
      return error(res, 'User account is inactive', 403);
    }

    await otpService.sendOtp(phone);
    return success(res, {}, 'OTP sent successfully');
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    await otpService.verifyOtp(phone, otp);

    let user = await User.findOne({ phone });

    if (!user) {
      return error(res, 'User does not exist', 404);
    } else if (user.status !== 'ACTIVE') {
      return error(res, 'User account is inactive', 403);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    next(err);
  }
};

export const loginWeb = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return error(res, 'Invalid credentials', 401);
    }

    if (user.role === 'RM') {
      return error(res, 'Web login not allowed for RM role', 403);
    }

    if (!user.passwordHash) {
      return error(res, 'Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return error(res, 'Invalid credentials', 401);
    }

    if (user.status !== 'ACTIVE') {
      if (user.role === 'SUPER_ADMIN') {
        user.status = 'ACTIVE';
      } else {
        return error(res, 'User account is inactive', 403);
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Remove passwordHash from user object
    const userObj = user.toObject();
    delete userObj.passwordHash;

    return success(res, {
      accessToken,
      refreshToken,
      user: userObj
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'ACTIVE') {
      return error(res, 'Invalid or inactive user', 401);
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    return success(res, { accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Basic logout logic (could implement token blacklist)
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userObj = req.user.toObject();
    delete userObj.passwordHash;
    return success(res, userObj);
  } catch (err) {
    next(err);
  }
};

export const updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken, appVersion } = req.body;
    
    req.user.fcmToken = fcmToken;
    if (appVersion) {
      req.user.appVersion = appVersion;
    }
    await req.user.save();

    return success(res, {}, 'FCM Token updated successfully');
  } catch (err) {
    next(err);
  }
};
