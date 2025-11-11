import { tryCatch } from 'bullmq';
import callbackFn from '../../utils/callbackFn';
import { IUser } from '../../modules/user/user.interface';
import Message from '../../modules/messages/messages.models';
import { Types } from 'mongoose';
import Chat from '../../modules/chat/chat.models';
import { IChat } from '../../modules/chat/chat.interface';
import getChatList from './chatList.handlers';
import { deflate } from 'zlib';

const SeenMessageHandlers = async (
  io: any,
  chatId: string,
  user: any,
  callback: any,
) => {
  if (!chatId) {
    return callbackFn(callback, {
      success: false,
      message: 'chatId id is required',
    });
  }

  try {
    const chat: IChat | null = await Chat.findById(chatId);
    if (!chat) {
      return callbackFn(callback, {
        success: false,
        message: 'chat not found',
      });
    }

    Message.updateMany(
      {
        chat: new Types.ObjectId(chatId),
        receiver: new Types.ObjectId(user?.userId),
        seen: false,
      },
      { seen: true },
    );
    const user1 = chat.participants[0];
    const user2 = chat.participants[1];
    getChatList(io, { _id: user1 }, callback);
    getChatList(io, { _id: user2 }, callback);
  } catch (error: any) {
    return callbackFn(callback, {
      success: false,
      message: error?.message || 'seen message failed',
    });
  }
};

export default SeenMessageHandlers;
