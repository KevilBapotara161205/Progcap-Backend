export const buildPagination = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  let sort = { createdAt: -1 }; // Default sort

  if (query.sort) {
    const sortParts = query.sort.split(',');
    sort = {};
    sortParts.forEach(part => {
      if (part.startsWith('-')) {
        sort[part.substring(1)] = -1;
      } else {
        sort[part] = 1;
      }
    });
  }

  return { page, limit, skip, sort };
};

export const paginateQuery = async (Model, filter = {}, options = {}, populate = null) => {
  const { page = 1, limit = 10, skip = 0, sort = { createdAt: -1 } } = options;

  let query = Model.find(filter).sort(sort).skip(skip).limit(limit);

  if (populate) {
    query = query.populate(populate);
  }

  const [data, total] = await Promise.all([
    query.exec(),
    Model.countDocuments(filter).exec()
  ]);

  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
};
