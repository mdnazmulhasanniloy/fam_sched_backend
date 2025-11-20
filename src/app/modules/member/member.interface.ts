import { Model, ObjectId } from 'mongoose';

export interface IMember {
  user: ObjectId;
  member: ObjectId;
}

export interface IMemberCreate extends IMember {
  email: string;
  name: string;
  password?: string;
}

export type IMemberModules = Model<IMember, Record<string, unknown>>;
