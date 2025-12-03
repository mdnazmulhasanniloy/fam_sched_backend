import { Model } from 'mongoose';

export interface IHistory {
  fieldName: string;
  oldValue: any;
  newValue: any;
  updatedAt: Date;
}

export type IHistoryModules = Model<IHistory, Record<string, unknown>>;
