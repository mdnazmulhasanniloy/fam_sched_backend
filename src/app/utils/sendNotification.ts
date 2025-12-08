import httpStatus from 'http-status';
import firebaseAdmin from './firebase';
import AppError from '../error/AppError';
import { pubClient } from '../redis';
import { modeType } from '../modules/notification/notification.interface';

type NotificationPayload = {
  title: string;
  body: string;
  data?: any;
  userId: string;
  save?: boolean;
  token?: string;
};

export const sendSingleNotification = async (
  fcmToken: string,
  payload: NotificationPayload,
) => {
  try {
    if (!fcmToken)
      throw new AppError(httpStatus.BAD_REQUEST, 'FCM token is required');

    const { title, body, data, userId, save = true } = payload;

    await firebaseAdmin
      .messaging()
      .send({
        token: fcmToken,
        notification: { title, body },
        data: data || {},
      });

    if (save) {
      await pubClient.rPush(
        'notification',
        JSON.stringify({
          receiver: userId,
          message: title,
          description: body,
          refference: data?._id,
          model_type: modeType.Events,
        }),
      );
    }

    console.log('✅ Notification sent:', title);
  } catch (err: any) {
    console.error('❌ Error sending notification:', err);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      err.message || 'Failed to send notification',
    );
  }
};
