import { Model, ObjectId } from 'mongoose';
import { IPackage } from '../package/package.interface';
import { IUser } from '../user/user.interface';

export interface ISubscriptions {
  _id?: ObjectId | string;
  user: ObjectId | IUser;
  package: ObjectId | IPackage;
  isPaid: boolean;
  trnId: string;
  expiredAt: Date;
  amount: number;
  limit: number;
  isExpired: boolean;
  isDeleted: boolean;
}

export type ISubscriptionsModel = Model<
  ISubscriptions,
  Record<string, unknown>
>;
