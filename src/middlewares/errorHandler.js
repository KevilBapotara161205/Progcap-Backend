import { error as errorResponse } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, `Resource not found with id of ${err.value}`, 400);
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return errorResponse(res, 'Validation Error', 422, messages);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    return errorResponse(res, 'Duplicate field value entered', 400);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  // Default to 500
  return errorResponse(res, err.message || 'Server Error', 500);
};
