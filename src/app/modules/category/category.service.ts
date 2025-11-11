/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { ICategory } from './category.interface';
import Category from './category.models';
import QueryBuilder from '../../class/builder/QueryBuilder';
import AppError from '../../error/AppError';

const createCategory = async (payload: ICategory) => {
  const category = await Category.isExistByName(payload?.name);
  if (category && category?.isDeleted) {
    return await Category.findByIdAndUpdate(category?._id, payload, {
      new: true,
    });
  }

  const result = await Category.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create category');
  }
  return result;
};

const getAllCategories = async (query: Record<string, any>) => {
  const categoriesModel = new QueryBuilder(Category.find(), query)
    .search(['name'])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await categoriesModel.modelQuery;
  const meta = await categoriesModel.countTotal();

  return {
    data: data,
    meta,
  };
};

const getCategoryById = async (id: string) => {
  const result = await Category.findById(id);
  if (!result) {
    throw new Error('Category not found');
  }
  return result;
};

const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  const result = await Category.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new Error('Failed to update category');
  }
  return result;
};

const deleteCategory = async (id: string) => {
  const result = await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus?.BAD_REQUEST, 'Failed to delete category');
  }

  return result;
};

export const categoryService = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
