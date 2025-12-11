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
    startEvent: {
      type: Date,
      required: true,
    },
    endEvent: {
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

    remainder1: {
      value: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        enum: ['m', 'h', 'd', 'w'],
      },
    },
    remainder2: {
      value: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        enum: ['m', 'h', 'd', 'w'],
      },
    },
    remainder3: {
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
      default: 'off',
    },
    jobIds: [
      {
        type: String,
      },
    ],
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
