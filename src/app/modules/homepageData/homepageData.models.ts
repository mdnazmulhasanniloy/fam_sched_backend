
import { model, Schema } from 'mongoose';
import { IHomepageData, IHomepageDataModules } from './homepageData.interface';

const homepageDataSchema = new Schema<IHomepageData>(
  {
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
 

const HomepageData = model<IHomepageData, IHomepageDataModules>(
  'HomepageData',
  homepageDataSchema
);
export default HomepageData;