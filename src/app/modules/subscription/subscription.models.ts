import { model, Schema } from 'mongoose';
import { ISubscriptions, ISubscriptionsModel } from './subscription.interface';

// Define the Mongoose schema
const SubscriptionsSchema = new Schema<ISubscriptions>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    package: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
    isPaid: { type: Boolean, default: false },
    expiredAt: { type: Date, default: null },
    trnId: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    limit: { type: Number, default: null },
    isExpired: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Create and export the model
const Subscription = model<ISubscriptions, ISubscriptionsModel>(
  'Subscriptions',
  SubscriptionsSchema,
);

export default Subscription;
