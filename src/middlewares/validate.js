import { validationResult } from 'express-validator';
import { error as errorResponse } from '../utils/response.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return errorResponse(res, 'Validation Error', 422, errorMessages);
  }
  next();
};
