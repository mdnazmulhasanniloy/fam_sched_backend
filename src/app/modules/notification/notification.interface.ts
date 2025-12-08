import { ObjectId } from 'mongodb';
export enum modeType {
  Member = 'Member',
  Payments = 'Payments',
  Events = 'Events',
}
export interface TNotification {
  receiver: ObjectId;
  message: string;
  description?: string;
  refference: ObjectId;
  model_type: modeType;
  date?: Date;
  read: boolean;
  isDeleted: boolean;
}
