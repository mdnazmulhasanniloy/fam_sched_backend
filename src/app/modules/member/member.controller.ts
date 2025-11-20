import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { memberService } from './member.service';
import sendResponse from '../../utils/sendResponse';

const createMember = catchAsync(async (req: Request, res: Response) => {
  req.body.user = req?.user?.userId;
  const result = await memberService.createMember(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Member created successfully',
    data: result,
  });
});

const getMyMembers = catchAsync(async (req: Request, res: Response) => {
  req.query.user = req?.user?.userId;
  const result = await memberService.getAllMember(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All member fetched successfully',
    data: result,
  });
});

const getMemberById = catchAsync(async (req: Request, res: Response) => {
  const result = await memberService.getMemberById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Member fetched successfully',
    data: result,
  });
});

const updateMember = catchAsync(async (req: Request, res: Response) => {
  const result = await memberService.updateMember(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Member updated successfully',
    data: result,
  });
});

const deleteMember = catchAsync(async (req: Request, res: Response) => {
  const result = await memberService.deleteMember(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Member deleted successfully',
    data: result,
  });
});

export const memberController = {
  createMember,
  getMyMembers,
  getMemberById,
  updateMember,
  deleteMember,
};
