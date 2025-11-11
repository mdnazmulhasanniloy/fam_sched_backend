import { Server } from 'socket.io';
import { getMyChatList } from '../services/getChatList';
import { pubClient } from '../../redis';
import callbackFn from '../../utils/callbackFn';

const getChatList = async (
  io: Server, 
  user: any,
  callback: (arg: any) => void,
) => {
  try {
    const redisKey = `chat_list:${user.userId}`;
    const cachedChatList = await pubClient.get(redisKey);

    let chatList;

    if (cachedChatList) {
      chatList = JSON.parse(cachedChatList);
    } else {
      chatList = await getMyChatList(user.userId);
      await pubClient.set(redisKey, JSON.stringify(chatList), {
        EX: 30, // Cache 30s
      });
    }

    const userSocketId = (await pubClient.hGet(
      'userId_to_socketId',
      user?.userId?.toString(),
    )) as string;

    io.to(userSocketId).emit('chat_list', chatList);

    callbackFn(callback, {
      success: true,
      message: 'chat list get success',
      data: chatList,
    });
  } catch (error: any) {
    return callbackFn(callback, { success: false, message: error?.message });
  }
};

export default getChatList;
