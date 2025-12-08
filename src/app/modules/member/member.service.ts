import httpStatus from 'http-status';
import { IMember, IMemberCreate } from './member.interface';
import Member from './member.models';
import QueryBuilder from '../../core/builder/QueryBuilder';
import AppError from '../../error/AppError';
import { User } from '../user/user.models'; 
import { modeType } from '../notification/notification.interface';
import { USER_ROLE } from '../user/user.constants';
import { sendEmail } from '../../utils/mailSender';
import path from 'path';
import fs from 'fs';
import generateCryptoString from '../../utils/generateCryptoString';
import { pubClient } from '../../redis';

const createMember = async (payload: IMemberCreate) => {
  const randomPass = generateCryptoString(6);
  const isExists = await User.isUserExist(payload?.email);
  const user = await User.findById(payload?.user);
  if (isExists) {
    const member = await Member.create({
      user: payload.user,
      member: isExists._id,
    });
    await pubClient.rPush(
      'notification',
      JSON.stringify({
        receiver: isExists._id,
        message: `You have been added as a member`,
        description: `${user!?.name} has added you to their member list. You can now access associated features and updates.`,
        refference: member?._id,
        model_type: modeType.Member,
      }),
    );
    return member;
  }

  const userCreate = await User.create({
    name: payload?.name,
    email: payload?.email,
    password: payload?.password || randomPass,
    role: USER_ROLE?.worker,
    'verification.status': true,
    expireAt: null,
  });

  if (!userCreate) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to create user for member',
    );
  }

  const result = await Member.create({
    user: payload.user,
    member: userCreate._id,
  });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create member');
  }

  const otpEmailPath = path.join(
    __dirname,
    '../../../../public/view/add_member.html',
  );

  await sendEmail(
    payload?.email,
    'Welcome to the Team - Member Access Created',
    fs
      .readFileSync(otpEmailPath, 'utf8')
      .replace('{{memberName}}', payload?.name)
      .replace('{{addedByName}}', user!?.name)
      .replace('{{memberEmail}}', payload?.email)
      .replace('{{temporaryPassword}}', payload?.password || randomPass),
  );
  return result;
};

const getAllMember = async (query: Record<string, any>) => {
  const memberModel = new QueryBuilder(
    Member.find({}).populate([
      { path: 'user', select: '_id name email phoneNumber profile role' },
      { path: 'member', select: '_id name email phoneNumber profile role' },
    ]),
    query,
  )
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await memberModel.modelQuery;
  const meta = await memberModel.countTotal();

  const response = { data, meta };
  return response;
};

const getMemberById = async (id: string) => {
  const result = await Member.findById(id).populate([
    { path: 'user', select: '_id name email phoneNumber profile role' },
    { path: 'member', select: '_id name email phoneNumber profile role' },
  ]);
  if (!result) {
    throw new Error('Member not found!');
  }

  return result;
};

const updateMember = async (id: string, payload: Partial<IMember>) => {
  const result = await Member.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new Error('Failed to update Member');
  }

  return result;
};

const deleteMember = async (id: string) => {
  const result = await Member.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete member');
  }

  return result;
};

export const memberService = {
  createMember,
  getAllMember,
  getMemberById,
  updateMember,
  deleteMember,
};
