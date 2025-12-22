/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createServer, Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import { defaultTask } from './app/utils/defaultTask';
import colors from 'colors';
import initializeSocketIO from './app/socket';
// import './app/job/croneJob';
import './app/job/event.worker';
import './app/job/notification.worker';

let server: Server;
const socketServer = createServer(app);

async function main() {
  try {
    const io = await initializeSocketIO(socketServer);
    await mongoose.connect(config.database_url as string);
    defaultTask();
    server = app.listen(Number(config.port), config.ip as string, () => {
      console.log(
        colors.italic.green.bold(
          `💫 Simple Server Listening on  http://${config?.ip}:${config?.port} `,
        ),
      );
    });
    io.listen(Number(config.socket_port));
    console.log(
      colors.yellow.bold(
        `⚡Socket.io running on  http://${config.ip}:${config.socket_port}`,
      ),
    );
  } catch (err) {
    console.error(err);
  }
}
main();

process.on('unhandledRejection', err => {
  console.log(`😈 unahandledRejection is detected , shutting down ...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on('uncaughtException', () => {
  console.log(`😈 uncaughtException is detected , shutting down ...`);
  process.exit(1);
});
