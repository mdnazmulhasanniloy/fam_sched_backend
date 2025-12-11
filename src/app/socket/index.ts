const { Server } = require('socket.io');
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { socketAuthMiddleware } from './middleware/auth.socket';
import { Socket } from 'socket.io';
import { connectRedis, pubClient, subClient } from '../redis';

const initializeSocketIO = async (server: HttpServer) => {
  await connectRedis();

  const io = new Server(server, {
    adapter: createAdapter(pubClient, subClient),
    cors: {
      origin: '*',
    },
  });

  io.adapter(createAdapter(pubClient, subClient));
  io.use(socketAuthMiddleware);
  global.socketio = io;
  io.on('connection', async (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);
    const userId = socket.data?.userId as string;
    if (!userId) {
      console.warn(`Socket ${socket.id} connected without userId`);
      return;
    }
    // Redis ID -> socketID map
    await pubClient.hSet('userId_to_socketId', userId, socket.id);

    //  socketID -> userId map
    await pubClient.hSet('socketId_to_userId', socket.id, userId);

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      const uid = await pubClient.hGet('socketId_to_userId', socket.id);

      if (uid) {
        await pubClient.hDel('socketId_to_userId', socket.id);
        await pubClient.hDel('userId_to_socketId', uid);
        console.log(
          `Removed Redis mapping for userId ${uid} and socketId ${socket.id}`,
        );
      }
    });
  });
  return io;
};

export default initializeSocketIO;
