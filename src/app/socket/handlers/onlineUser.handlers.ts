import { Server } from 'socket.io';
import { pubClient } from '../../redis';

export const getOnlineUserIds = async (io: Server) => {
  const userIds = await pubClient.hKeys('userId_to_socketId');
  io.emit('onlineUsersList', userIds);
};
