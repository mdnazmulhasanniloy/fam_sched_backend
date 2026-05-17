import dns from 'dns';
// Force Google DNS servers before any connection attempt
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

import { createServer, Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { defaultTask } from './app/utils/defaultTask';
import colors from 'colors';
import initializeSocketIO from './app/socket';
import './app/job/event.worker';
import './app/job/notification.worker';

let server: Server;
const socketServer = createServer(app);

async function main() {
  try {
    const io = await initializeSocketIO(socketServer);

    await mongoose.connect(config.database_url as string, {
      family: 4,
      serverSelectionTimeoutMS: 10000, // fail faster for debugging
    });

    console.log(colors.green.bold('✅ MongoDB connected successfully'));
    defaultTask();

    server = app.listen(Number(config.port), config.ip as string, () => {
      console.log(
        colors.italic.green.bold(
          `💫 Server running on http://${config?.ip}:${config?.port}`,
        ),
      );
    });

    io.listen(Number(config.socket_port));
    console.log(
      colors.yellow.bold(
        `⚡ Socket.io running on http://${config.ip}:${config.socket_port}`,
      ),
    );
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1); // exit cleanly on startup failure
  }
}

main();

process.on('unhandledRejection', err => {
  console.log(`😈 unhandledRejection detected, shutting down...`, err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', () => {
  console.log(`😈 uncaughtException detected, shutting down...`);
  process.exit(1);
});
