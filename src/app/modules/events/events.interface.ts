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
  date: Date;
  assignTo: ObjectId | IUser;
  includeInSchedule: ObjectId[] | IUser[];
  remainder: IRemainder;
  recurring: string;
  note: string;
  notifyHistory: Date[];
  isAssignMe: boolean;
  isDeleted: boolean;
}

export type IEventsModules = Model<IEvents, Record<string, unknown>>;
