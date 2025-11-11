import { Server, Socket } from 'socket.io';
import { pubClient } from '../../redis';
import callbackFn from '../../utils/callbackFn';
import Chat from '../../modules/chat/chat.models';
import getChatList from './chatList.handlers';
interface IPayload {
  imageUrl: string[];
  text: string;
  receiver: string;
  chat: string;
  sender: string;
}
const sendMessage = async (
  io: Server,
  payload: IPayload,
  user: any,
  callback: (args: any) => void,
) => {
  try {
    if (!payload?.chat) {
      const chat = await Chat.create({
        participants: [payload?.receiver, payload?.sender],
        status: 'accepted',
      });
      payload.chat = chat._id?.toString();
    }

    const message = {
      chat: payload?.chat,
      receiver: payload?.receiver,
      sender: user?.userId,
      text: payload?.text,
      imageUrl: payload.imageUrl,
      createdAt: new Date().toISOString(),
    };

    const redisKey = `chat:${payload.chat?.toString()}:messages`;
    await pubClient.rPush(redisKey, JSON.stringify(message));

    const [senderSocketId, receiverSocketId] = (await Promise.all([
      pubClient.hGet('userId_to_socketId', message.sender?.toString()),
      pubClient.hGet('userId_to_socketId', message.receiver?.toString()),
    ])) as string[];
    console.log('🚀 ~ sendMessage ~ receiverSocketId:', receiverSocketId);
    console.log('🚀 ~ sendMessage ~ senderSocketId:', senderSocketId);
    io.to(senderSocketId).emit('new_message', { message });
    io.to(receiverSocketId).emit('new_message', { message });
    getChatList(io, { _id: payload.sender }, callback);
    getChatList(io, { _id: payload.receiver }, callback);
    callbackFn<IPayload>(callback, {
      success: true,
      message: 'message send successfully',
      data: message,
    });
  } catch (error: any) {
    console.log(error);
    callbackFn(callback, {
      success: false,
      message: error?.message,
    });
  }
};

export default sendMessage;
