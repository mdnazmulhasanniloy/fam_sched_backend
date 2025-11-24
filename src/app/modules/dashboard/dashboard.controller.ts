import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { dashboardService } from './dashboard.service';
import sendResponse from '../../utils/sendResponse'; 

const getTopCards = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getTopCards(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Top cards data fetched successfully',
    data: result,
  });
});
const dashboardChart = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.dashboardChart(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'chart data fetched successfully',
    data: result,
  });
});
export const dashboardController = {
  getTopCards,
  dashboardChart,
};
