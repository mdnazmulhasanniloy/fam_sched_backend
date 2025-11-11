import fs from 'fs';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { IUser } from './user.interface';
import { User } from './user.models';
import bcrypt from 'bcrypt';
import config from '../../config';
import { pubClient } from '../../redis';
import { uploadToS3 } from '../../utils/s3';
import generateCryptoString from '../../utils/generateCryptoString';
import { USER_ROLE } from './user.constants';
import path from 'path';
import { sendEmail } from '../../utils/mailSender';
import QueryBuilder from '../../core/builder/QueryBuilder';

export type IFilter = {
  searchTerm?: string;
  [key: string]: any;
};

const createUser = async (payload: IUser): Promise<IUser> => {
  const isExist = await User.isUserExist(payload.email as string);

  if (isExist && !isExist?.verification?.status) {
    const { email, ...updateData } = payload;
    updateData.password = await bcrypt.hash(
      payload?.password,
      Number(config.bcrypt_salt_rounds),
    );
    const user = await User.findByIdAndUpdate(isExist?._id, updateData, {
      new: true,
    });
    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'user creation failed');
    }
    return user;
  } else if (isExist && isExist?.verification?.status) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'User already exists with this email',
    );
  }

  if (!payload.password) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password is required');
  }

  const user = await User.create(payload);
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User creation failed');
  }

  // 🔹 Redis cache invalidation
  try {
    // Clear all user list caches
    const keys = await pubClient.keys('users:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }

    // Optionally, clear single user cache if updating an existing unverified user
    if (user?._id) {
      await pubClient.del(`user:${user._id?.toString()}`);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (createUser):', err);
  }

  return user;
};

const getAllUser = async (query: Record<string, any>) => {
  try {
    const cacheKey = `users:${JSON.stringify(query)}`;

    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. Build query
    const userModel = new QueryBuilder(User.find(), query)
      .search(['name', 'email', 'phoneNumber', 'status'])
      .filter()
      .paginate()
      .sort();

    const data: any = await userModel.modelQuery;
    const meta = await userModel.countTotal();

    const response = { data, meta };

    // 3. Store in cache (30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(response), { EX: 30 });

    return response;
  } catch (err) {
    console.error('Redis caching error:', err);

    // fallback to DB if Redis fails
    const userModel = new QueryBuilder(User.find(), query)
      .search(['name', 'email', 'phoneNumber', 'status'])
      .filter()
      .paginate()
      .sort();

    const data: any = await userModel.modelQuery;
    const meta = await userModel.countTotal();

    return { data, meta };
  }
};

const geUserById = async (id: string) => {
  try {
    const cacheKey = `users:${id}`;

    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. Fetch from DB
    const result = await User.findById(id);
    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    // 3. Store in cache (e.g., 60s TTL)
    await pubClient.set(cacheKey, JSON.stringify(result), { EX: 60 });

    return result;
  } catch (err) {
    console.error('Redis caching error (geUserById):', err);

    // fallback if Redis fails
    const result = await User.findById(id);
    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }
    return result;
  }
};

const updateUser = async (id: string, payload: Partial<IUser>) => {
  const user = await User.findByIdAndUpdate(id, payload, { new: true });
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User updating failed');
  }

  try {
    // single user cache delete
    await pubClient.del(`users:${id}`);

    // user list cache clear
    const keys = await pubClient.keys('users:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (updateUser):', err);
  }
  return user;
};

const createWorker = async (payload: IUser) => {
  const tempPassword = generateCryptoString(6);

  const user = await User.create({
    ...payload,
    password: tempPassword,
    role: USER_ROLE.worker,
    expireAt: null,
    'verification.status': true,
  });
  if (!user)
    throw new AppError(httpStatus.BAD_REQUEST, 'sub admin create failed');
  const otpEmailPath = path.join(
    __dirname,
    '../../../../public/view/sub_admin_mail.html',
  );

  await sendEmail(
    user?.email,
    'New Sub‑Admin Created',
    fs
      .readFileSync(otpEmailPath, 'utf8')
      .replace('{{fullName}}', user?.name)
      .replace('{{email}}', user?.email)
      .replace('{{tempPassword}}', tempPassword)
      .replace('{{loginUrl}}', '#')
      .replace('{{helpUrl}}', '#'),
  );

  return user;
};

const deleteUser = async (id: string) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'user deleting failed');
  }

  try {
    // single user cache delete
    await pubClient.del(`users:${id}`);

    // user list cache clear
    const keys = await pubClient.keys('users:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    console.error('Redis cache invalidation error (deleteUser):', err);
  }

  return user;
};

export const userService = {
  createUser,
  getAllUser,
  geUserById,
  updateUser,
  deleteUser,
  createWorker,
};
