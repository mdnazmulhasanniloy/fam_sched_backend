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

export const isValidFcmToken = async (token: string): Promise<boolean> => {
  try {
    await firebaseAdmin.messaging().send(
      {
        token,
        data: {
          type: 'token-validation',
        },
      },
      true,
    );

    return true;
  } catch (err: any) {
    console.error('FCM token validation error:', err);

    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-argument'
    ) {
      return false;
    }

    return false;
  }
};

export const sendLoginNotification = async (token: string) => {
  return firebaseAdmin.messaging().send({
    token,
    notification: {
      title: 'Login Alert!',
      body: 'New device login successful!',
    },
    data: {
      type: 'LOGIN_ALERT',
    },
  });
};
