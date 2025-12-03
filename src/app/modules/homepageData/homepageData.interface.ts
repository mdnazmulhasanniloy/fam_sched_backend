
import { Model } from 'mongoose';

export interface IHomepageData {}

export type IHomepageDataModules = Model<IHomepageData, Record<string, unknown>>;