import { Model, ObjectId } from 'mongoose';
import { IUser } from '../user/user.interface';

export interface IPayments {
  _id: string;
  id: string;
  user: ObjectId | IUser;
  subscription: ObjectId;
  amount: Number;
  status: 'paid' | 'pending' | 'cancel' | 'refound';
  tranId: string;
  cardLast4: string;
  receipt_url: string;
  paymentIntentId: string;
  paymentAt: Date;
}

export type IPaymentsModules = Model<IPayments, Record<string, unknown>>;
