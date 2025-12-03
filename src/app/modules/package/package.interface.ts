import { Model, Types } from 'mongoose';

export interface IPackageHistory {
  field: string;
  oldValue: any;
  newValue: any;
  updatedAt: Date;
}

export interface IPackage {
  title: string;
  description: string;
  maxMembers: number;
  price: number;
  popularity: number;
  isDeleted: boolean;
  updateHistory: IPackageHistory[];
}

export type IPackageModules = Model<IPackage, Record<string, unknown>>;
