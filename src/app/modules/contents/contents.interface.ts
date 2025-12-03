import { Model, ObjectId } from 'mongoose';

export interface IContents {
  _id?: string;
  aboutUs?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;

  isDeleted?: boolean;
}

export type IContentsModel = Model<IContents, Record<string, unknown>>;
