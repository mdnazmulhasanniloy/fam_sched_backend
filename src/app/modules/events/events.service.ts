import httpStatus from 'http-status';
import { IEvents } from './events.interface';
import Events from './events.models';
import AppError from '../../error/AppError';
import { pubClient } from '../../redis';
import QueryBuilder from '../../core/builder/QueryBuilder';

const createEvents = async (payload: IEvents) => {
  const result = await Events.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create events');
  }

  // 🔹 Redis cache invalidation
  try {
    // Clear all events list caches
    const keys = await pubClient.keys('events:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }

    // Optionally, clear single events cache if updating an existing unverified events
    if (result?._id) {
      await pubClient.del('events:' + result?._id?.toString());
    }
  } catch (err) {
    console.error('Redis cache invalidation error (createEvents):', err);
  }

  return result;
};

const getAllEvents = async (query: Record<string, any>) => {
  try {
    const cacheKey = 'events:' + JSON.stringify(query);
    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    const eventsModel = new QueryBuilder(
      Events.find({ isDeleted: false }),
      query,
    )
      .search([''])
      .filter()
      .paginate()
      .sort()
      .fields();

    const data = await eventsModel.modelQuery;
    const meta = await eventsModel.countTotal();

    const response = { data, meta };

    // 3. Store in cache (30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(response), { EX: 30 });

    return response;
  } catch (err) {
    console.error('Redis caching error (getAllEvents):', err);
    const eventsModel = new QueryBuilder(
      Events.find({ isDeleted: false }),
      query,
    )
      .search([''])
      .filter()
      .paginate()
      .sort()
      .fields();

    const data = await eventsModel.modelQuery;
    const meta = await eventsModel.countTotal();

    return {
      data,
      meta,
    };
  }
};

const getEventsById = async (id: string) => {
  try {
    const cacheKey = 'events:' + id;

    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. Fetch from DB
    const result = await Events.findById(id);
    if (!result || result?.isDeleted) {
      throw new Error('Events not found!');
    }

    // 3. Store in cache (e.g., 30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(result), { EX: 30 });

    return result;
  } catch (err) {
    console.error('Redis caching error (geEventsById):', err);
    const result = await Events.findById(id);
    if (!result || result?.isDeleted) {
      throw new Error('Events not found!');
    }
    return result;
  }
};

const updateEvents = async (id: string, payload: Partial<IEvents>) => {
  const result = await Events.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new Error('Failed to update Events');
  }

  // 🔹 Redis cache invalidation
  try {
    // single events cache delete
    await pubClient.del('events:' + id);

    // events list cache clear
    const keys = await pubClient.keys('events:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (updateEvents):', err);
  }

  return result;
};

const deleteEvents = async (id: string) => {
  const result = await Events.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete events');
  }

  // 🔹 Redis cache invalidation
  try {
    // single events cache delete
    await pubClient.del('events' + id?.toString());

    // events list cache clear
    const keys = await pubClient.keys('events:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (deleteEvents):', err);
  }

  return result;
};

export const eventsService = {
  createEvents,
  getAllEvents,
  getEventsById,
  updateEvents,
  deleteEvents,
};
