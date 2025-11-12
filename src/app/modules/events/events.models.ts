import { model, Schema, Types } from 'mongoose';
import { IEvents, IEventsModules } from './events.interface';

const eventsSchema = new Schema<IEvents>(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    assignTo: {
      type: Types.ObjectId,
      ref: 'User',
    },
    includeInSchedule: [
      {
        type: Types.ObjectId,
        ref: 'User',
      },
    ],
    remainder: {
      value: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        enum: ['m', 'h', 'd', 'w'],
      },
    },
    recurring: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'off'],
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    isAssignMe: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const Events = model<IEvents, IEventsModules>('Events', eventsSchema);
export default Events;
