import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { paymentsService } from './payments.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import config from '../../config';

const checkout = catchAsync(async (req: Request, res: Response) => {
  req.body.user = req.user.userId;
  const result = await paymentsService.checkout(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment link get successful',
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.confirmPayment(req?.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment successful',
  });
});
const revenueCatWebHook = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader !== config?.revenuecat_webhook_secret);
  if (authHeader !== config?.revenuecat_webhook_secret) {
    throw new AppError(httpStatus?.UNAUTHORIZED, 'Unauthorized Access');
  }
  const result = await paymentsService.revenueCatWebHook(req?.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment successful',
  });
});


const createPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.createPayments(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payments created successfully',
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getAllPayments(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All payments fetched successfully',
    data: result,
  });
});

const getPaymentsById = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getPaymentsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments fetched successfully',
    data: result,
  });
});

export const paymentsController = {
  createPayments,
  getAllPayments,
  getPaymentsById,
  checkout,
  confirmPayment,
  revenueCatWebHook,
};
