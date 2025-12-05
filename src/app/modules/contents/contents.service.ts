/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import Contents from './contents.models';
import { IContents } from './contents.interface';
import History from '../history/history.models';
import moment from 'moment';

// Create a new content
const createContents = async (payload: IContents) => {
  const result = await Contents.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Content creation failed');
  }
  return result;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAllContents = async (query: { key?: keyof IContents }) => {
  const result = await Contents.findOne({ isDeleted: false });

  if (query?.key) {
    const history = await History.find({ fieldName: query.key }).sort({
      updatedAt: -1,
    });
    return {
      data: result?.[query.key] || '',
      history: history || [],
    };
  } else {
    return result;
  }
};

// Get content by ID
const getContentsById = async (id: string) => {
  const result = await Contents.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Oops! Content not found');
  }
  return result;
};

// Update content
const updateContents = async (payload: Partial<IContents>) => {
  const content = await Contents.find({});

  if (!content.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  Object.keys(payload).forEach(field => {
    const oldValue = (content[0] as any)[field];
    const newValue = (payload as any)[field];

    if (oldValue !== newValue) {
      History.create({
        fieldName: field,
        oldValue,
        newValue,
        updatedAt: moment().toDate(),
      });
    }
  });

  const result = await Contents.findByIdAndUpdate(content[0]._id, payload, {
    new: true,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Content update failed');
  }

  return result;
};
// Delete content
const deleteContents = async (id: string) => {
  const result = await Contents.findByIdAndUpdate(
    id,
    {
      $set: {
        isDeleted: true,
      },
    },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Content deletion failed');
  }

  return result;
};

export const contentsService = {
  createContents,
  getAllContents,
  getContentsById,
  updateContents,
  deleteContents,
};


 
