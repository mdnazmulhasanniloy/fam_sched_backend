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
import { notificationQueue } from '../../redis';
import bcrypt from 'bcrypt';
import config from '../../config';
import { isValidObjectId } from 'mongoose';

const resendInvite = async (id: string, actorId: string, actorRole: string) => {
  if (!isValidObjectId(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid member ID');
  }

  const member = await Member.findById(id);
  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, 'Member not found');
  }

  const isAdmin = [
    USER_ROLE.admin,
    USER_ROLE.super_admin,
    USER_ROLE.sub_admin,
  ].includes(actorRole);
  if (!isAdmin && member.user.toString() !== actorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the owner or an admin can resend this invite',
    );
  }

  const memberUser = await User.findById(member.member).select('+password');
  if (!memberUser || memberUser.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Member user not found');
  }

  const now = new Date();
  if (
    !memberUser.needsPasswordChange ||
    !memberUser.temporaryPasswordExpiresAt
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This member does not have a pending temporary password invite',
    );
  }
  // if (memberUser.temporaryPasswordExpiresAt.getTime() > now.getTime()) {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'The temporary password has not expired yet',
  //   );
  // }

  const owner = await User.findById(member.user);
  if (!owner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Member owner not found');
  }

  const temporaryPassword = generateCryptoString(6);
  const temporaryPasswordExpiresAt = new Date(
    now.getTime() + 48 * 60 * 60 * 1000,
  );
  const html = fs
    .readFileSync(
      path.join(__dirname, '../../../../public/view/add_member.html'),
      'utf8',
    )
    .replace('{{memberName}}', memberUser.name)
    .replace('{{addedByName}}', owner.name)
    .replace('{{memberEmail}}', memberUser.email)
    .replace('{{temporaryPassword}}', temporaryPassword);
  const hashedPassword = await bcrypt.hash(
    temporaryPassword,
    Number(config.bcrypt_salt_rounds),
  );

  // Match the previous credentials so concurrent resends or password resets
  // cannot overwrite each other.
  const updated = await User.findOneAndUpdate(
    {
      _id: memberUser._id,
      password: memberUser.password,
      needsPasswordChange: true,
      // temporaryPasswordExpiresAt: { $lte: now },
      isDeleted: false,
    },
    { $set: { password: hashedPassword, temporaryPasswordExpiresAt } },
    { new: true },
  );
  if (!updated) {
    throw new AppError(
      httpStatus.CONFLICT,
      'The invite has changed. Please refresh and try again',
    );
  }

  try {
    await sendEmail(memberUser.email, 'Your New Member Invite', html);
  } catch (error) {
    // Restore only if the credentials are still the ones from this resend.
    await User.updateOne(
      {
        _id: memberUser._id,
        password: hashedPassword,
        temporaryPasswordExpiresAt,
      },
      {
        $set: {
          password: memberUser.password,
          temporaryPasswordExpiresAt: memberUser.temporaryPasswordExpiresAt,
        },
      },
    );
    throw error;
  }

  return { memberId: id, email: memberUser.email, temporaryPasswordExpiresAt };
};

const createMember = async (payload: IMemberCreate) => {
  const randomPass = generateCryptoString(6, ' ').trim();
  const isExists = await User.isUserExist(payload?.email);
  const user = await User.findById(payload?.user);
  if (isExists) {
    const member = await Member.create({
      user: payload.user,
      member: isExists._id,
    });
    await notificationQueue.add('send_notification', {
      receiver: isExists._id,
      message: `You have been added as a member`,
      // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion
      description: `${user!?.name} has added you to their member list. You can now access associated features and updates.`,
      refference: member?._id,
      model_type: modeType.Member,
    });
    return member;
  }

  const userCreate = await User.create({
    name: payload?.name,
    email: payload?.email,
    password: payload?.password || randomPass,
    role: USER_ROLE?.worker,
    needsPasswordChange: true,
    temporaryPasswordExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
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
      // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion
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
      {
        path: 'member',
        select: '_id name email phoneNumber profile role needsPasswordChange',
      },
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
  resendInvite,
  createMember,
  getAllMember,
  getMemberById,
  updateMember,
  deleteMember,
};
