import { Model } from 'mongoose';

export interface IPackage {
  title: string;
  description: string;
  members: number;
  price: number;
  popularity: number;
  isDeleted: boolean;
}

export type IPackageModules = Model<IPackage, Record<string, unknown>>;
