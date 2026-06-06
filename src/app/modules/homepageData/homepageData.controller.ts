import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { homepageDataService } from './homepageData.service';
import sendResponse from '../../utils/sendResponse';

const calendarData = catchAsync(async (req: Request, res: Response) => {
  const query = {
    ...req.query,
    user: req?.user?.userId,
  };
  const result = await homepageDataService.calendarData(query);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'HomepageData created successfully',
    data: result,
  });
});
const WorkerCalendarData = catchAsync(async (req: Request, res: Response) => {
  const query = {
    ...req.query,
    user: req?.user?.userId,
  };
  const result = await homepageDataService.WorkerCalendarData(query);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'HomepageData created successfully',
    data: result,
  });
});

export const homepageDataController = {
  calendarData,
  WorkerCalendarData,
};
