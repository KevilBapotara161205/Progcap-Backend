export const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const error = (res, message = 'Error', statusCode = 400, errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

export const paginated = (res, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    message: 'Success',
    data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages: Math.ceil(total / limit)
    }
  });
};
