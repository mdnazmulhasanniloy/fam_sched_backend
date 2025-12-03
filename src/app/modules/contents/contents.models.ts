import { Schema, model } from 'mongoose';
import { IContents, IContentsModel } from './contents.interface';

const contentsSchema = new Schema<IContents>(
  {
    aboutUs: {
      type: String,
    },
    termsAndConditions: {
      type: String,
    },
    privacyPolicy: {
      type: String,
    }, 
    isDeleted: {
      type: Boolean,
      default: false,
    },
  
  },
  {
    timestamps: true,
  },
);

// filter out deleted documents

const Contents = model<IContents, IContentsModel>('Contents', contentsSchema);

export default Contents;
