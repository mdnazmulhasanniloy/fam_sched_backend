import { Model, ObjectId } from 'mongoose';
import { IUser } from '../user/user.interface';

export interface IPayments {
  _id: string;
  id: string;
  user: ObjectId | IUser;
  subscription: ObjectId;
  amount: number;
  status: 'paid' | 'pending' | 'cancel' | 'refound';
  tranId: string;
  cardLast4: string;
  receipt_url: string;
  paymentIntentId: string;
  paymentAt: Date;
}

export type IPaymentsModules = Model<IPayments, Record<string, unknown>>;

export interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  new_product_id?: string;
  entitlement_ids: string[];
  transaction_id: string;
  original_transaction_id: string;
  price: number;
  price_in_purchased_currency: number;
  currency: string;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  environment: 'SANDBOX' | 'PRODUCTION';
  store: string;
  period_type: string;
}
