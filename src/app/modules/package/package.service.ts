import httpStatus from 'http-status';
import { IPackage } from './package.interface';
import Package from './package.models';
import QueryBuilder from '../../core/builder/QueryBuilder';
import AppError from '../../error/AppError';
import { pubClient } from '../../redis';

const createPackage = async (payload: IPackage) => {
  const result = await Package.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create package');
  }

  // 🔹 Redis cache invalidation
  try {
    // Clear all package list caches
    const keys = await pubClient.keys('package:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }

    // Optionally, clear single package cache if updating an existing unverified package
    if (result?._id) {
      await pubClient.del('package:' + result?._id?.toString());
    }
  } catch (err) {
    console.error('Redis cache invalidation error (createPackage):', err);
  }

  return result;
};

const getAllPackage = async (query: Record<string, any>) => {
  try {
    const cacheKey = 'package:' + JSON.stringify(query);
    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    const packageModel = new QueryBuilder(
      Package.find({ isDeleted: false }),
      query,
    )
      .search(['title'])
      .filter()
      .paginate()
      .sort()
      .fields();

    const data = await packageModel.modelQuery;
    const meta = await packageModel.countTotal();

    const response = { data, meta };

    // 3. Store in cache (30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(response), { EX: 30 });

    return response;
  } catch (err) {
    console.error('Redis caching error (getAllPackage):', err);
    const packageModel = new QueryBuilder(
      Package.find({ isDeleted: false }),
      query,
    )
      .search(['title'])
      .filter()
      .paginate()
      .sort()
      .fields();

    const data = await packageModel.modelQuery;
    const meta = await packageModel.countTotal();

    return {
      data,
      meta,
    };
  }
};

const getPackageById = async (id: string) => {
  try {
    const cacheKey = 'package:' + id;

    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. Fetch from DB
    const result = await Package.findById(id);
    if (!result || result?.isDeleted) {
      throw new Error('Package not found!');
    }

    // 3. Store in cache (e.g., 30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(result), { EX: 30 });

    return result;
  } catch (err) {
    console.error('Redis caching error (gePackageById):', err);
    const result = await Package.findById(id);
    if (!result || result?.isDeleted) {
      throw new Error('Package not found!');
    }
    return result;
  }
};

const updatePackage = async (id: string, payload: Partial<IPackage>) => {
  const result = await Package.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new Error('Failed to update Package');
  }

  // 🔹 Redis cache invalidation
  try {
    // single package cache delete
    await pubClient.del('package:' + id);

    // package list cache clear
    const keys = await pubClient.keys('package:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (updatePackage):', err);
  }

  return result;
};

const deletePackage = async (id: string) => {
  const result = await Package.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete package');
  }

  // 🔹 Redis cache invalidation
  try {
    // single package cache delete
    await pubClient.del('package' + id?.toString());

    // package list cache clear
    const keys = await pubClient.keys('package:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (deletePackage):', err);
  }

  return result;
};

export const packageService = {
  createPackage,
  getAllPackage,
  getPackageById,
  updatePackage,
  deletePackage,
};
