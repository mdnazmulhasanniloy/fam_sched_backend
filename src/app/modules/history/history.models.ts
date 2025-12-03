import { model, Schema } from 'mongoose';
import { IHistory, IHistoryModules } from './history.interface';

const historySchema = new Schema<IHistory>({
  fieldName: {
    type: String,
    required: true,
  },
  oldValue: {
    type: Schema.Types.Mixed,
    required: true,
  },
  newValue: {
    type: Schema.Types.Mixed,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const History = model<IHistory, IHistoryModules>('History', historySchema);
export default History;
