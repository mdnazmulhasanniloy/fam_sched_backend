type IOptions = {
  page?: number;
  limit?: number;
  sort?: string;
};

type IOptionResult = {
  page: number;
  limit: number;
  skip: number;
  sort: string;
};

const calculatePagination = (options: IOptions): IOptionResult => {
  const page = Number(options?.page) || 1;
  const limit = Number(options?.limit) || 10;
  const skip = Number((page - 1) * limit);
  const sort = options?.sort || 'createdAt';

  return {
    page,
    limit,
    skip,
    sort,
  };
};

// ✅ ADD THIS (missing function)
export const generatePaginationMetadata = ({
  total,
  page,
  limit,
}: {
  total: number;
  page: number;
  limit: number;
}) => {
  return {
    page,
    limit,
    total,
    totalPage: Math.ceil(total / limit),
  };
};

export const paginationHelper = { calculatePagination };
