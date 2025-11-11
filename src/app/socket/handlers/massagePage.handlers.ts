import { Server } from 'socket.io';
import { IUser } from '../../modules/user/user.interface';
import callbackFn from '../../utils/callbackFn';
import { User } from '../../modules/user/user.models';
import { pubClient } from '../../redis';
import Message from '../../modules/messages/messages.models';

const MessagePageHandlers = async (
  io: Server,
  userId: string,
  currentUserId: string,
  callback: (data: any) => void,
) => {
  if (!userId) {
    return callbackFn(callback, {
      success: false,
      message: 'userId is required',
    });
  }

  try {
    // 1️⃣ Check Redis cache for receiver details
    const receiverCacheKey = `user_details:${userId}`;
    let receiverDetails: IUser | null;

    const cachedReceiver = await pubClient.get(receiverCacheKey);
    if (cachedReceiver) {
      receiverDetails = JSON.parse(cachedReceiver);
    } else {
      receiverDetails = await User.findById(userId).select(
        '_id email role profile name',
      );
      if (!receiverDetails) {
        return callbackFn(callback, {
          success: false,
          message: 'User not found!',
        });
      }
      await pubClient.setEx(
        receiverCacheKey,
        60,
        JSON.stringify(receiverDetails),
      );
    }
    console.log(receiverDetails);
    if (!receiverDetails) {
      return;
    }

    const payload = {
      _id: receiverDetails._id,
      name: receiverDetails.name,
      email: receiverDetails.email,
      profile: receiverDetails.profile,
      role: receiverDetails.role,
    };

    // 2️⃣ Get sender’s socket ID from Redis
    const userSocket = await pubClient.hGet(
      'userId_to_socketId',
      currentUserId,
    );

    if (!userSocket) {
      return callbackFn(callback, {
        success: false,
        message: 'User socket ID not found',
      });
    }

    // 3️⃣ Emit receiver details to socket
    io.to(userSocket).emit('user_details', payload);

    // 4️⃣ Redis caching for messages
    const messageCacheKey = `messages:${currentUserId}:${userId}`;
    let getPreMessage;

    const cachedMessages = await pubClient.get(messageCacheKey);
    if (cachedMessages) {
      getPreMessage = JSON.parse(cachedMessages);
    } else {
      getPreMessage = await Message.find({
        $or: [
          { sender: currentUserId, receiver: userId },
          { sender: userId, receiver: currentUserId },
        ],
      }).sort({ updatedAt: 1 });

      await pubClient.setEx(messageCacheKey, 30, JSON.stringify(getPreMessage));
    }

    // 5️⃣ Emit previous messages
    io.to(userSocket).emit('message', getPreMessage || []);

    // 6️⃣ Final callback
    callbackFn(callback, {
      success: true,
      message: 'Message page data retrieved successfully',
      data: {
        getPreMessage,
        userDetails: payload,
      },
    });
  } catch (error: any) {
    console.error('Error in message-page event:', error);
    callbackFn(callback, {
      success: false,
      message: error.message,
    });
  }
};

export default MessagePageHandlers;
