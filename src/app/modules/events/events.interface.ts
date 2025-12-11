import { Model, ObjectId } from 'mongoose';
import { IUser } from '../user/user.interface';
interface IRemainder {
  value: number;
  unit: string;
}
export interface IEvents {
  _id: string;
  user: ObjectId | IUser;
  title: string;
  startEvent: Date;
  endEvent: Date;
  assignTo: ObjectId | IUser;
  includeInSchedule: ObjectId[] | IUser[];
  remainder1: IRemainder;
  remainder2: IRemainder;
  remainder3: IRemainder;
  recurring: 'daily' | 'weekly' | 'monthly' | 'off';
  note: string;
  jobIds: string[];
  notifyHistory: Date[];
  isAssignMe: boolean;
  isDeleted: boolean;
}

export type IEventsModules = Model<IEvents, Record<string, unknown>>;
