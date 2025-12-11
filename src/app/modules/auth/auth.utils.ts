import jwt, { JwtPayload } from 'jsonwebtoken';
import firebaseAdmin from '../../utils/firebase';

export const createToken = (
  jwtPayload: { userId: string; role: string },
  secret: string,
  expiresIn: string,
) => {
  return jwt.sign(jwtPayload, secret, {
    expiresIn,
  });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as JwtPayload;
};




export const isValidFcmToken = async (token: string) => {
  try {
    await firebaseAdmin.messaging().send({
      token,
      notification: {
        title: 'valid-check',
        body: 'checking token validity',
      },
    });

    return true; // valid token
  } catch (err: any) {
    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered'
    ) {
      return false; // token invalid
    }

    return false;
  }
};
