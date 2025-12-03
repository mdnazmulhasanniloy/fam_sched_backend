
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';  
import { historyService } from './history.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const createHistory = catchAsync(async (req: Request, res: Response) => {
 const result = await historyService.createHistory(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'History created successfully',
    data: result,
  });

});

const getAllHistory = catchAsync(async (req: Request, res: Response) => {

 const result = await historyService.getAllHistory(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All history fetched successfully',
    data: result,
  });

});

const getHistoryById = catchAsync(async (req: Request, res: Response) => {
 const result = await historyService.getHistoryById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'History fetched successfully',
    data: result,
  });

});
const updateHistory = catchAsync(async (req: Request, res: Response) => {
const result = await historyService.updateHistory(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'History updated successfully',
    data: result,
  });

});


const deleteHistory = catchAsync(async (req: Request, res: Response) => {
 const result = await historyService.deleteHistory(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'History deleted successfully',
    data: result,
  });

});

export const historyController = {
  createHistory,
  getAllHistory,
  getHistoryById,
  updateHistory,
  deleteHistory,
};