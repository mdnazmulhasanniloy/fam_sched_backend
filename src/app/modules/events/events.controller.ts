
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';  
import { eventsService } from './events.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const createEvents = catchAsync(async (req: Request, res: Response) => {
 const result = await eventsService.createEvents(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Events created successfully',
    data: result,
  });

});

const getAllEvents = catchAsync(async (req: Request, res: Response) => {

 const result = await eventsService.getAllEvents(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All events fetched successfully',
    data: result,
  });

});

const getEventsById = catchAsync(async (req: Request, res: Response) => {
 const result = await eventsService.getEventsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Events fetched successfully',
    data: result,
  });

});
const updateEvents = catchAsync(async (req: Request, res: Response) => {
const result = await eventsService.updateEvents(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Events updated successfully',
    data: result,
  });

});


const deleteEvents = catchAsync(async (req: Request, res: Response) => {
 const result = await eventsService.deleteEvents(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Events deleted successfully',
    data: result,
  });

});

export const eventsController = {
  createEvents,
  getAllEvents,
  getEventsById,
  updateEvents,
  deleteEvents,
};