import { model, Schema } from 'mongoose';
import { IPackage, IPackageModules } from './package.interface';

const packageSchema = new Schema<IPackage>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    members: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    popularity: {
      type: Number,
      default: 0,
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const Package = model<IPackage, IPackageModules>('Package', packageSchema);
export default Package;
