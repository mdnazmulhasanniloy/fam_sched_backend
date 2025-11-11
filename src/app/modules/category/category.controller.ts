import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { categoryService } from './category.service';
import sendResponse from '../../utils/sendResponse'; 
import { uploadToS3 } from '../../utils/s3';

const createCategory = catchAsync(async (req: Request, res: Response) => {

  if (req.file) {
    req.body.banner = await uploadToS3({
      file: req.file,
      fileName: `images/categories/banner/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

  const result = await categoryService.createCategory(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Category created successfully',
    data: result,
  });
});

const getAllCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.getAllCategories(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All categories fetched successfully',
    data: result,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.getCategoryById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Category fetched successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => { 
  if (req.file) {
    req.body.banner = await uploadToS3({
      file: req.file,
      fileName: `images/categories/banner/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }
  const result = await categoryService.updateCategory(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.deleteCategory(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Category deleted successfully',
    data: result,
  });
});

export const categoryController = {
  createCategory,
  getAllCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
