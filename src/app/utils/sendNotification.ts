import httpStatus from 'http-status';
import firebaseAdmin from './firebase';
import AppError from '../error/AppError';
import { notificationQueue } from '../redis';
import { modeType } from '../modules/notification/notification.interface';

type NotificationPayload = {
  title: string;
  body: string;
  data?: any;
  userId: string;
  save?: boolean;
  token?: string;
  type?: string;
  referenceId?: string;
  modelType?: modeType;
  dedupeKey?: string;
};

export const sendSingleNotification = async (
  fcmToken: string,
  payload: NotificationPayload,
) => { 
  try {
    if (!fcmToken)
      throw new AppError(httpStatus.BAD_REQUEST, 'FCM token is required');
    const {
      title,
      body,
      data,
      userId,
      save = true,
      type,
      referenceId,
      modelType = modeType.Events,
      dedupeKey,
    } = payload;

    const dataPayload: Record<string, string> = {};
    if (data?.id != null) {
      dataPayload.payload = JSON.stringify(data.id);
    }
    const eventId = data?.id ?? data?._id;
    if (eventId != null) {
      dataPayload.eventId = String(eventId);
    }
    if (type) {
      dataPayload.type = type;
    }
    await firebaseAdmin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: dataPayload,
    });

    if (save) {
      await notificationQueue.add('send_notification', {
        receiver: userId,
        message: title,
        description: body,
        refference: referenceId || data?._id || data?.id,
        model_type: modelType,
        type: type || null,
        ...(dedupeKey ? { dedupeKey } : {}),
      });
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
