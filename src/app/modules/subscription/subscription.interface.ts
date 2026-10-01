import { Model, ObjectId } from 'mongoose';
import { IPackage } from '../package/package.interface';
import { IUser } from '../user/user.interface';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled_pending_expiry'
  | 'expired'
  | 'billing_retry'
  | 'grace_period'
  | 'revoked';

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
  status?: SubscriptionStatus;
  autoRenewStatus?: boolean | null;
  appleTransactionId?: string | null;
  originalTransactionId?: string | null;
  subscriptionSource?: 'stripe' | 'apple' | 'revenuecat';
}

export type ISubscriptionsModel = Model<
  ISubscriptions,
  Record<string, unknown>
>;
