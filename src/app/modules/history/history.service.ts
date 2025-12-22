
import httpStatus from 'http-status';
import { IHistory } from './history.interface';
import History from './history.models';
import QueryBuilder from '../../core/builder/QueryBuilder';
import AppError from '../../error/AppError';
import { pubClient } from '../../redis';

const createHistory = async (payload: IHistory) => {
  const result = await History.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create history');
  }

  // 🔹 Redis cache invalidation
  try {
    // Clear all history list caches
    const keys = await pubClient.keys('history:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }

    // Optionally, clear single history cache if updating an existing unverified history
    if (result?._id) {
      await pubClient.del('history:'+ result?._id?.toString());
    }
  } catch (err) {
    console.error('Redis cache invalidation error (createHistory):', err);
  }



  return result;
};

const getAllHistory = async (query: Record<string, any>) => {
 
  try {
  const cacheKey = 'history:' + JSON.stringify(query);
      // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  const historyModel = new QueryBuilder(History.find({}), query)
    .search([""])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await historyModel.modelQuery;
  const meta = await historyModel.countTotal();

const response = { data, meta };

  // 3. Store in cache (30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(response), { EX: 30 });

    return response;

  
  } catch (err) {
    console.error('Redis caching error (getAllHistory):', err);
    const historyModel = new QueryBuilder(History.find({}), query)
    .search([""])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await historyModel.modelQuery;
  const meta = await historyModel.countTotal();

  return {
    data,
    meta,
  };
};
    }

const getHistoryById = async (id: string) => {
try{
 const cacheKey = 'history:' +id;

    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

// 2. Fetch from DB
   const result = await History.findById(id);
  if (!result) {
    throw new Error('History not found!');
  }

// 3. Store in cache (e.g., 30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(result), { EX: 30 });

    return result;
}catch (err) {
 console.error('Redis caching error (geHistoryById):', err);
  const result = await History.findById(id);
  if (!result) {
    throw new Error('History not found!');
  }
  return result;
  
  }
};

const updateHistory = async (id: string, payload: Partial<IHistory>) => {
  const result = await History.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new Error('Failed to update History');
  }

   // 🔹 Redis cache invalidation
  try {
    // single history cache delete
    await pubClient.del('history:'+id);

    // history list cache clear
    const keys = await pubClient.keys('history:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (updateHistory):', err);
  }

  return result;
};

const deleteHistory = async (id: string) => {
  const result = await History.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete history');
  }

 // 🔹 Redis cache invalidation
  try {
    // single history cache delete
    await pubClient.del('history'+id?.toString());

    // history list cache clear
    const keys = await pubClient.keys('history:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (deleteHistory):', err);
  }




  return result;
};

export const historyService = {
  createHistory,
  getAllHistory,
  getHistoryById,
  updateHistory,
  deleteHistory,
};