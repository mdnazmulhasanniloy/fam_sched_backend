
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';  
import { packageService } from './package.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const createPackage = catchAsync(async (req: Request, res: Response) => {
 const result = await packageService.createPackage(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Package created successfully',
    data: result,
  });

});

const getAllPackage = catchAsync(async (req: Request, res: Response) => {

 const result = await packageService.getAllPackage(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All package fetched successfully',
    data: result,
  });

});

const getPackageById = catchAsync(async (req: Request, res: Response) => {
 const result = await packageService.getPackageById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Package fetched successfully',
    data: result,
  });

});
const updatePackage = catchAsync(async (req: Request, res: Response) => {
const result = await packageService.updatePackage(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Package updated successfully',
    data: result,
  });

});


const deletePackage = catchAsync(async (req: Request, res: Response) => {
 const result = await packageService.deletePackage(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Package deleted successfully',
    data: result,
  });

});

export const packageController = {
  createPackage,
  getAllPackage,
  getPackageById,
  updatePackage,
  deletePackage,
};