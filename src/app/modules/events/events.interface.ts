import { Model, ObjectId } from 'mongoose';
interface IRemainder {
  value: number;
  unit: string;
}
export interface IEvents {
  user: ObjectId;
  title: string;
  date: Date;
  assignTo: ObjectId;
  includeInSchedule: ObjectId[];
  remainder: IRemainder;
  recurring: string;
  note: string;
  isAssignMe: boolean;
  isDeleted: boolean;
}

export type IEventsModules = Model<IEvents, Record<string, unknown>>;
