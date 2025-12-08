import { pubClient } from '../redis';

export const deleteEventsCache = async (eventId: string) => {
  try {
    await pubClient.del('events:' + eventId);

    const keys = await pubClient.keys('events:*');
    if (keys.length > 0) {
      await pubClient.del(keys);
    }

    console.log(`🗑️ Cache cleared for event ${eventId}`);
  } catch (err) {
    console.error('Redis cache invalidation error:', err);
  }
};
