// types/global.d.ts বা index.ts এর শুরুর দিকে
import { Server as SocketIOServer } from 'socket.io';

declare global {
  var socketio: SocketIOServer | undefined;
}
