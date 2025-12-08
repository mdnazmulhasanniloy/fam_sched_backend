import { Model, Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId | string;
  status: string;
  profile: string;
  name: string;
  email: string;
  bio: string;
  phoneNumber: string;
  password: string;
  notification: boolean;
  alert: string;

  // profile Details
  gender: 'Male' | 'Female' | 'Others';
  dateOfBirth: string;
  customerId: string;
  loginWth: 'google' | 'apple' | 'facebook' | 'credentials';
  role: string;
  address?: string;
  needsPasswordChange: boolean;
  passwordChangedAt?: Date;
  isDeleted: boolean;
  expireAt: Date;
  fcmToken: string;
  verification: {
    otp: string | number;
    expiresAt: Date;
    status: boolean;
  };
  device: {
    ip: string;
    browser: string;
    os: string;
    device: string;
    lastLogin: string;
  };
}

export interface UserModel extends Model<IUser> {
  isUserExist(email: string): Promise<IUser>;
  IsUserExistId(id: string): Promise<IUser>;
  IsUserExistUserName(userName: string): Promise<IUser>;
  getAdmin(): Promise<IUser>;

  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
}
