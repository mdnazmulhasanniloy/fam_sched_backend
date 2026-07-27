import httpStatus from 'http-status';
import { IPayments, RevenueCatEvent } from './payments.interface';
import Payments from './payments.models';
import AppError from '../../error/AppError';
import { PAYMENT_STATUS } from './payments.constants';
import { User } from '../user/user.models';
import { USER_ROLE } from '../user/user.constants';
import { startSession } from 'mongoose';
import config from '../../config';
import { modeType } from '../notification/notification.interface';
import moment from 'moment';
import Subscription from '../subscription/subscription.models';
import { ISubscriptions } from '../subscription/subscription.interface';
import { IPackage } from '../package/package.interface';
import StripeService from '../../core/stripe/stripe';
import Package from '../package/package.models';
import QueryBuilder from '../../core/builder/QueryBuilder';
import { notificationQueue } from '../../redis';
import { createToken } from '../auth/auth.utils';

interface IPaymentItems {
  price_data: {
    currency: string;
    product_data: {
      name: string;
    };
    unit_amount: number;
  };
  quantity: number;
}

const checkout = async (payload: IPayments) => {
  let paymentData: IPayments | null;

  const subscription: ISubscriptions | null = await Subscription.findById(
    payload?.subscription,
  ).populate('package');
  if (!subscription)
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription is not found!');
  const isExistPayment: IPayments | null = await Payments.findOne({
    subscription: payload?.subscription,
    status: PAYMENT_STATUS.pending,
    user: payload?.user,
  });
  if (isExistPayment) {
    paymentData = isExistPayment as IPayments;
  } else {
    payload.amount = subscription?.amount;

    const createdPayment = await Payments.create(payload);

    if (!createdPayment) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create payment',
      );
    }
    paymentData = createdPayment;
  }

  if (!paymentData)
    throw new AppError(httpStatus.BAD_REQUEST, 'payment not found');

  const products: IPaymentItems[] = [];
  products.push({
    price_data: {
      currency: 'usd',
      product_data: {
        name:
          (subscription?.package as IPackage).title || 'Subscription Payment',
      },
      unit_amount: parseFloat((Number(paymentData?.amount) * 100).toFixed(2)),
    },
    quantity: 1,
  });

  let customerId;
  const user = await User.IsUserExistId(paymentData?.user?.toString());
  if (user?.customerId) {
    customerId = user?.customerId;
  } else {
    const customer = await StripeService.createCustomer(
      user?.email,
      user?.name,
    );
    customerId = customer?.id;
  }

  const success_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentData?._id}`;

  const cancel_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentData?._id}`;

  const checkoutSession = await StripeService.getCheckoutSession(
    products,
    success_url,
    cancel_url,
    customerId,
  );

  return checkoutSession?.url;
};

const confirmPayment = async (query: Record<string, any>) => {
  const { sessionId, paymentId } = query;
  const session = await startSession();
  const PaymentSession = await StripeService.getPaymentSession(sessionId);
  const paymentIntentId = PaymentSession.payment_intent as string;
  const paymentIntent =
    await StripeService.getStripe().paymentIntents.retrieve(paymentIntentId);

  if (!(await StripeService.isPaymentSuccess(sessionId))) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment session is not completed',
    );
  }

  try {
    session.startTransaction();

    const charge = await StripeService.getStripe().charges.retrieve(
      paymentIntent.latest_charge as string,
    );

    if (charge?.refunded) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment has been refunded');
    }
    const paymentDate = moment.unix(charge.created).format('YYYY-MM-DD HH:mm'); // Adjusted format

    // Create the output object
    const chargeDetails = {
      amount: charge?.amount,
      currency: charge?.currency,
      status: charge?.status,
      paymentMethod: charge?.payment_method,
      paymentMethodDetails: charge?.payment_method_details?.card,
      transactionId: charge?.balance_transaction,
      cardLast4: charge?.payment_method_details?.card?.last4,
      paymentDate: paymentDate,
      receipt_url: charge?.receipt_url,
    };

    const payment = await Payments.findByIdAndUpdate(paymentId);

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment Not Found!');
    }

    if (payment?.status === PAYMENT_STATUS.paid)
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment Already confirmed!');
    else if (payment?.status === PAYMENT_STATUS.cancel)
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment Already canceled!');
    else if (payment?.status === PAYMENT_STATUS.refound)
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment Already refunded!');

    const oldSubscription: ISubscriptions | null = await Subscription.findOne({
      user: payment?.user,
      isPaid: true,
      isExpired: false,
      isDeleted: false,
    }).session(session);

    let expiredAt = moment();

    if (
      oldSubscription?.expiredAt &&
      moment(oldSubscription.expiredAt).isAfter(moment())
    ) {
      expiredAt = moment(oldSubscription.expiredAt);
    }
    if (oldSubscription) {
      await Subscription.findByIdAndUpdate(
        oldSubscription._id,
        { isExpired: true },
        { session },
      );
    }

    expiredAt = expiredAt.add(30, 'days');

    const paymentData = {
      status: PAYMENT_STATUS?.paid,
      tranId: chargeDetails.transactionId ?? null,
      cardLast4: chargeDetails.cardLast4 ?? null,
      receipt_url: chargeDetails?.receipt_url || charge.receipt_url,
      paymentIntentId,
      paymentAt: moment.unix(charge.created).toDate(),
    };

    const updatedPayments = await Payments.findByIdAndUpdate(
      paymentId,
      paymentData,
      {
        new: true,
        session,
      },
    );

    const subscription = await Subscription.findByIdAndUpdate(
      payment?.subscription,
      {
        isPaid: true,
        expiredAt: expiredAt,
        trnId: paymentData?.tranId,
      },
      { new: true, session },
    );

    const packages = await Package.findByIdAndUpdate(
      subscription?.package,
      {
        $inc: { popularity: 1 },
      },
      { new: true, session },
    );
    if (!packages)
      throw new AppError(httpStatus.BAD_REQUEST, 'Package update failed!');
    const user = await User.findByIdAndUpdate(
      payment?.user,
      {
        role: USER_ROLE.user,
      },
      { session, upsert: false },
    );
    const admin = await User.getAdmin();

    await notificationQueue.add('send_notification', {
      receiver: user?._id,
      message: 'Subscription Successful',
      description:
        'Your payment has been received and your subscription is now active.',
      refference: paymentId,
      model_type: modeType.Payments,
    });

    if (admin) {
      await notificationQueue.add('send_notification', {
        receiver: admin?._id,
        message: 'New Subscription Payment Received',
        description:
          'A user has successfully subscribed to a package and the payment is completed.',
        refference: paymentId,
        model_type: modeType.Payments,
      });
    }

    const jwtPayload: { userId: string; role: string } = {
      userId: user?._id?.toString() as string,
      role: user?.role as string,
    };

    const accessToken = createToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.jwt_access_expires_in as string,
    );

    await session.commitTransaction();
    return {
      ...updatedPayments?.toObject(),
      accessToken,
      chargeDetails,
      package: packages,
    };
  } catch (error: any) {
    await session.abortTransaction();

    if (paymentIntentId) {
      try {
        await StripeService.refund(paymentIntentId);
        // await Payments.findByIdAndUpdate(paymentId, {
        //   status: PAYMENT_STATUS.cancel,
        // });
      } catch (refundError: any) {
        console.error('Error processing refund:', refundError.message);
        throw new AppError(
          httpStatus.BAD_GATEWAY,

          'Error processing refund:' + refundError.message ||
            'Server internal error',
        );
      }
    }

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      error.message || 'Server internal error',
    );
  } finally {
    session.endSession();
  }
};

const revenueCatWebHook = async (payload: { event: RevenueCatEvent }) => {
  const event = payload.event;
  const {
    type,
    app_user_id,
    product_id,
    transaction_id,
    price,
    expiration_at_ms,
    purchased_at_ms,
  } = event;

  console.log('🚀 ~ revenueCatWebHook ~ event:', event);

  const isValidUserId = /^[0-9a-fA-F]{24}$/.test(app_user_id);
  if (!isValidUserId) {
    console.warn(
      `⚠️ Skipping event: app_user_id "${app_user_id}" is not a valid user ObjectId`,
    );
    return;
  }

  const user = await User.findById(app_user_id);
  if (!user) {
    console.warn(
      `⚠️ Skipping event: No user found for app_user_id ${app_user_id}`,
    );
    return;
  }

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL': {
      // Idempotency check: eki transaction duibar process na hoy
      const existing = await Subscription.findOne({ trnId: transaction_id });
      if (existing) {
        console.log(
          `Transaction ${transaction_id} already processed, skipping`,
        );
        return;
      }

      // RevenueCat product_id diye tomar nijer Package khuje ber koro
      const pkg = await Package.findOne({ title: product_id });
      if (!pkg) {
        console.error(
          `❌ No matching Package found for product_id: ${product_id}`,
        );
        return;
      }

      const sub = await Subscription.findOneAndUpdate(
        { user: user._id, isDeleted: false },
        {
          user: user?._id,
          package: pkg?._id,
          isPaid: true,
          isExpired: false,
          expiredAt: expiration_at_ms ? new Date(expiration_at_ms) : null,
          trnId: transaction_id,
          amount: price,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await Payments.create({
        amount: price,
        user: user?._id,
        subscription: sub?._id,

        status: PAYMENT_STATUS.paid,
        tranId: transaction_id,
        paymentAt: purchased_at_ms ? new Date(purchased_at_ms) : new Date(),
      });
      console.log(`Subscription activated for user ${user._id}`);
      break;
    }

    case 'CANCELLATION':
    case 'EXPIRATION': {
      await Subscription.findOneAndUpdate(
        { user: user._id, isDeleted: false },
        {
          // isPaid: false,
          isExpired: true,
        },
      );

      console.log(`Subscription revoked for user ${user._id} (${type})`);
      break;
    }

    case 'BILLING_ISSUE': {
      // Access ekhoni revoke na kore, ekta flag/notification pathao
      // (RevenueCat grace period dey, tai immediately revoke kora thik na)
      console.warn(
        `Billing issue for user ${user?._id}, transaction: ${transaction_id}`,
      );
      // TODO: notification/email service call koro user ke janate
      break;
    }

    case 'PRODUCT_CHANGE': {
      // Ei event e payment confirm hoyni, tai DB update na kore shudhu log/track koro
      console.log(
        `Product change intent for user ${user?._id}: ${product_id} -> ${event?.new_product_id}`,
      );
      break;
    }

    default:
      console.log(`Unhandled event type: ${type}`);
  }

  return;
};
const createPayments = async (payload: IPayments) => {
  const result = await Payments.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create payments');
  }
  return result;
};

const getAllPayments = async (query: Record<string, any>) => {
  const paymentsModel = new QueryBuilder(Payments.find({}), query)
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await paymentsModel.modelQuery;
  const meta = await paymentsModel.countTotal();

  return {
    data,
    meta,
  };
};

const getPaymentsById = async (id: string) => {
  const result = await Payments.findById(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payments not found!');
  }
  return result;
};

export const paymentsService = {
  createPayments,
  getAllPayments,
  getPaymentsById,
  checkout,
  confirmPayment,
  revenueCatWebHook,
};
