# Timezone Notification Analysis

## Issue Summary

Notifications are **not respecting the selected timezone** when scheduling. Notifications should send at the specified local time, but currently they may be sending at incorrect times.

---

## Current Flow Analysis

### 1. Event Creation (events.service.ts:15-151)

```
User Input: startEvent = "10:00 AM", timezone = "Asia/Dhaka"
     ↓
Convert to UTC: moment.tz("10:00", "Asia/Dhaka").utc()
     ↓
Store in DB: "2026-06-03T04:00:00Z" (UTC)
```

### 2. Reminder Calculation (events.utils.ts:25-47)

```
calculateReminderTime(utcDate, 15, 'minutes', 'Asia/Dhaka'):
  moment.utc("2026-06-03T04:00:00Z")
    .tz("Asia/Dhaka")          // → "2026-06-03T10:00:00+06:00"
    .subtract(15, 'minutes')   // → "2026-06-03T09:45:00+06:00"
    .utc()                     // → "2026-06-03T03:45:00Z"
    .toDate()
     ↓
Result: Should trigger at "2026-06-03T03:45:00Z" (UTC)
```

---

## 🔴 IDENTIFIED ISSUES

### Issue #1: Logic Error in event.worker.ts (Line 22)

**Current Code:**

```typescript
if (!user?.fcmToken && !user?.notification) {
  await notificationQueue.add(...);
  return;
}
```

**Problem:**

- Uses `&&` (AND) operator - only adds to queue if user has **NEITHER** fcmToken **NOR** notification
- If user is missing just one (e.g., has no FCM token but notification is enabled), it still tries to send

**Should Be:**

```typescript
if (!user?.fcmToken || !user?.notification) {
  // User is missing either FCM token or notification is disabled
  await notificationQueue.add(...);
  return;
}
```

---

### Issue #2: Potential Redis Connection Issue (redis/index.ts)

The workers need Redis connected. Check if `connectRedis()` is being called before jobs are processed.

**Current:** `connectRedis()` is NOT called in server.ts
**Impact:** Redis clients may not be connected when workers try to process jobs

---

### Issue #3: Worker Not Processing Correctly (event.worker.ts:22)

When a user doesn't have FCM token or notification disabled, it adds to the wrong queue:

- Creates: `notificationQueue.add('send_notification', {...})`
- But uses: `general_notification` queue (line 31 in redis/index.ts)
- This queue's worker saves to DB instead of sending notification

---

## ⚠️ VERIFICATION STEPS

1. **Check Redis Connection:**

   ```bash
   # In server.ts, add before workers start:
   await connectRedis();
   ```

2. **Verify Timezone in Logs:**

   - When event is created, check console logs (line 99-105 in events.service.ts)
   - Should show UTC reminder time
   - Example: `⏰ Scheduling notification for Event ID: xxx at UTC time: 2026-06-03T03:45:00Z delay: 90000`

3. **Test Scenario:**
   - Set event for 10 AM Bangladesh time
   - Add 15-minute reminder
   - Check Redis queue to confirm delay is calculated correctly
   - Monitor when notification actually fires

---

## 🔧 APPLIED FIXES ✅

### Fix 1: Correct Logic Operator ✅
**File:** `src/app/job/event.worker.ts:22`

Changed from `&&` to `||`:
```typescript
if (!user?.fcmToken || !user?.notification) {
```

### Fix 2: Ensure Redis Connection ✅
**File:** `src/server.ts`

Added Redis connection before workers:
```typescript
import { connectRedis } from './app/redis';

async function main() {
  try {
    await connectRedis();  // ← Added
    const io = await initializeSocketIO(socketServer);
```

### Fix 3: Add Timezone Logging ✅
**File:** `src/app/modules/events/events.service.ts:99-111`

Enhanced logging to show timezone calculations:
```typescript
console.log('⏰ Scheduling notification...', {
  userTZ: event.timezone,
  eventTimeInTZ: moment.utc(date).tz(event.timezone).format(),
  reminderTimeUTC: reminderTime,
  scheduleDelayMs: delay,
});
```

### Fix 4: Clean Timezone Strings ✅
**File:** `src/app/modules/events/events.service.ts` (createEvents & updateEvents)

Remove spaces from timezone identifiers:
```typescript
payload.timezone = (payload.timezone || 'UTC').replace(/\s+/g, '');
```

**Why:** Frontend sends `"Asia / Dhaka"` but moment-timezone needs `"Asia/Dhaka"`

---

## ✅ VERIFICATION STATUS

**Current Test Results:**
- Event time: 9:07 AM Bangladesh (Asia/Dhaka)
- UTC conversion: 03:07 UTC ✅
- Reminder (5 min before): 03:02 UTC ✅
- Delay calculation: 89067 ms ✅
- Worker processing: ACTIVE ✅

**Console Output Confirms:**
```
timezone: 'Asia/Dhaka'                              ← Cleaned ✅
event time in TZ: '2026-06-03T09:07:00+06:00'      ← Correct ✅
UTC reminder time: '2026-06-03T03:02:00.000Z'      ← Accurate ✅
🔔 Processing event notification...                 ← Worker running ✅
});
```

---

## 📋 Testing Checklist

- [x] Redis connected on startup
- [x] Timezone string cleaned (spaces removed)
- [x] Notification delay calculated correctly
- [x] Worker processing jobs
- [x] Tested with Bangladesh timezone (UTC+6)
- [ ] Wait for notification to arrive (test the 89-second delay)
- [ ] Verify notification fires at correct local time
- [ ] Test with another timezone (USA, Europe, etc.)
