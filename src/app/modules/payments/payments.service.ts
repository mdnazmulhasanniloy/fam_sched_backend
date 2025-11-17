import httpStatus from 'http-status';
import { IPayments } from './payments.interface';
import Payments from './payments.models';
import AppError from '../../error/AppError';
import generateCryptoString from '../../utils/generateCryptoString';
import { PAYMENT_STATUS } from './payments.constants';
import { User } from '../user/user.models';
import { USER_ROLE } from '../user/user.constants';
import { ObjectId, startSession, Types } from 'mongoose';
import config from '../../config';
import { notificationServices } from '../notification/notification.service';
import { IUser } from '../user/user.interface';
import { modeType } from '../notification/notification.interface';
import moment from 'moment';
import Subscription from '../subscription/subscription.models';
import { ISubscriptions } from '../subscription/subscription.interface';
import { IPackage } from '../package/package.interface';
import StripeService from '../../core/stripe/stripe';
import Package from '../package/package.models';
import { populate } from 'dotenv';
import QueryBuilder from '../../core/builder/QueryBuilder';

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

// const checkout = async (payload: IPayments) => {
//   const tranId = generateCryptoString(10);
//   let paymentData: IPayments;

//   // Fetch the order details, if order doesn't exist throw an error
//   const order: IOrders | null = await Orders?.findById(payload?.order).populate(
//     'orderItems.product',
//     'additionalItems.topping',
//   );

//   if (!order) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Order Not Found!');
//   }

//   // Check if there's an existing pending payment for this order
//   const isExistPayment: IPayments | null = await Payments.findOne({
//     order: payload?.order,
//     status: PAYMENT_STATUS.pending,
//     user: payload?.user,
//   });

//   if (isExistPayment) {
//     const payment = await Payments.findByIdAndUpdate(
//       isExistPayment?._id,
//       { tranId },
//       { new: true },
//     );
//     paymentData = payment as IPayments;
//   } else {
//     // Calculate the order charge if any
//     const orderCharge = await User.findOne({ role: USER_ROLE.admin }).then(
//       admin => admin?.orderCharge ?? 0,
//     );

//     payload.tranId = tranId;
//     payload.author = order?.author as ObjectId;
//     payload.amount = Math.round(Number(order.totalPrice) + Number(orderCharge));

//     // Create new payment entry in the database
//     const createdPayment = await Payments.create(payload);

//     if (!createdPayment) {
//       throw new AppError(
//         httpStatus.INTERNAL_SERVER_ERROR,
//         'Failed to create payment',
//       );
//     }

//     paymentData = createdPayment;
//   }

//   if (!paymentData)
//     throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found');

//   // Prepare the products for checkout session
//   const products: IPaymentItems[] = [];

//   // Add order items to products list
//   order?.orderItems?.forEach(item => {
//     const price = Number((item?.product as IProducts)?.price);
//     const quantity = Number(item?.quantity);

//     // Validate the price and quantity before pushing to products
//     if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
//       console.error(
//         `Invalid price or quantity for item: ${JSON.stringify(item)}`,
//       );
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         `Invalid product details: ${JSON.stringify(item)}`,
//       );
//     }

//     products.push({
//       price_data: {
//         currency: 'usd',
//         product_data: {
//           name: (item?.product as IProducts)?.name ?? 'A Foods',
//         },
//         unit_amount: Math.round(price * 100),
//       },
//       quantity: quantity,
//     });
//   });

//   // Add additional items to products list
//   order?.additionalItems?.forEach(item => {
//     const price = Number((item.topping as ITopping).price);
//     const quantity = Number(item?.quantity);

//     // Validate the price and quantity before pushing to products
//     if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
//       console.error(
//         `Invalid price or quantity for item: ${JSON.stringify(item)}`,
//       );
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         `Invalid additional item details: ${JSON.stringify(item)}`,
//       );
//     }

//     products.push({
//       price_data: {
//         currency: 'usd',
//         product_data: {
//           name: (item.topping as ITopping).name,
//         },
//         unit_amount: Math.round(price * 100),
//       },
//       quantity: quantity,
//     });
//   });

//   // Check if user exists and has a customerId, if not create one
//   let customerId;
//   const user = await User.IsUserExistId(paymentData?.user?.toString());

//   if (user?.customerId) {
//     customerId = user?.customerId;
//   } else {
//     const customer = await StripeService.createCustomer(
//       user?.email,
//       user?.name,
//     );
//     customerId = customer?.id;
//   }

//   // Define success and cancel URLs
//   const success_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentData?._id}&device=${payload?.device}`;
//   const cancel_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentData?._id}`;

//   // Create the checkout session using Stripe service
//   const checkoutSession = await StripeService.getCheckoutSession(
//     products,
//     success_url,
//     cancel_url,
//     customerId,
//   );

//   return checkoutSession?.url;
// };

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
  const { sessionId, paymentId, device } = query;
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
    await session.commitTransaction();
    return {
      ...updatedPayments?.toObject(),
      chargeDetails,
      package: packages,
    };
  } catch (error: any) {
    await session.abortTransaction();

    if (paymentIntentId) {
      try {
        await StripeService.refund(paymentIntentId);
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
};
