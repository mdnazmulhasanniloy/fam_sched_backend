import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import Chat from '../../modules/chat/chat.models';
import Message from '../../modules/messages/messages.models';
import { pubClient } from '../../redis';

export const getMyChatList = async (userId: string) => {
  const chats = await Chat.find({
    participants: { $all: userId },
  }).populate({
    path: 'participants',
    select: 'name email profile role _id phoneNumber',
    match: { _id: { $ne: userId } },
  });

  if (!chats) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Chat list not found');
  }

  // extract all chat ids
  const chatIds = chats.map(chat => chat._id);
  // fetch all latest messages at once
  const messages = await Message.aggregate([
    { $match: { chat: { $in: chatIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$chat',
        latestMessage: { $first: '$$ROOT' },
      },
    },
  ]);

  // fetch all unread message counts at once
  const unreadCounts = await Message.aggregate([
    {
      $match: {
        chat: { $in: chatIds },
        seen: false,
        sender: { $ne: userId },
      },
    },
    {
      $group: {
        _id: '$chat',
        count: { $sum: 1 },
      },
    },
  ]);

  // Map for quick lookup
  const messageMap = new Map(
    messages.map(m => [m._id.toString(), m.latestMessage]),
  );
  const unreadMap = new Map(unreadCounts.map(u => [u._id.toString(), u.count]));

  const data = chats.map(chat => {
    const chatId = chat._id.toString();
    return {
      chat,
      message: messageMap.get(chatId) || null,
      unreadMessageCount: unreadMap.get(chatId) || 0,
    };
  });

  // sort by latest message time
  data.sort((a, b) => {
    const dateA = (a.message?.createdAt as any) || 0;
    const dateB = (b.message?.createdAt as any) || 0;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  return data;
};
