import { model, Schema, Types } from 'mongoose';
import { IPayments, IPaymentsModules } from './payments.interface';
import { PAYMENT_STATUS } from './payments.constants';
import generateCryptoString from '../../utils/generateCryptoString';

const paymentsSchema = new Schema<IPayments>(
  {
    id: {
      type: String,
      default: () => `${generateCryptoString(10)}`,
    },
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscription: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUS,
      default: PAYMENT_STATUS.pending,
    },
    tranId: { type: String, default: null },
    cardLast4: { type: String, default: null },
    receipt_url: { type: String, default: null },
    paymentIntentId: { type: String, default: null },
    paymentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Payments = model<IPayments, IPaymentsModules>('Payments', paymentsSchema);
export default Payments;
