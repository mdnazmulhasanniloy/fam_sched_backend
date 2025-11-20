import { model, Schema, Types } from 'mongoose';
import { IMember, IMemberModules } from './member.interface';

const memberSchema = new Schema<IMember>(
  {
    user: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },
    member: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

const Member = model<IMember, IMemberModules>('Member', memberSchema);
export default Member;
