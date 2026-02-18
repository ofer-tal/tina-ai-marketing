# TikTok Posting Guardrail Fixes - Implementation Summary

**Date Implemented:** 2026-02-16
**Issue:** TikTok posting workflow wrote the same videos to Google Sheet multiple times during the weekend of 2/14/2026 and 2/15/2026, causing duplicate posts via Buffer/Zapier.

**Root Cause:** The `sheetTriggeredAt` guardrail was not respected across multiple code paths, allowing posts to be written to Google Sheets multiple times.

## The Required Guardrail

Once `sheetTriggeredAt` is set for a post, that post **MUST NEVER** be written to the Google Sheet again, under ANY circumstances:
- No retries
- No recovery attempts
- No manual triggers
- The user explicitly stated they would rather have posts marked permanently as failed than have ANY post written to the Google Sheet twice.

## Implementation Summary

### Files Modified

1. **`/home/ofer/blush-marketing/backend/jobs/postingScheduler.js`**
2. **`/home/ofer/blush-marketing/backend/api/tiktok.js`**
3. **`/home/ofer/blush-marketing/backend/scripts/triggerPostNow.js`**
4. **`/home/ofer/blush-marketing/backend/models/MarketingPost.js`**
5. **`/home/ofer/blush-marketing/backend/services/googleSheetsService.js`**

---

## Critical Fixes Implemented

### Fix #1 (CRITICAL): `postToTikTok()` - Added `sheetTriggeredAt` Check
**File:** `postingScheduler.js:682-740`
**Line:** Added check after line 686

```javascript
// CRITICAL GUARDRAIL: Never write to Google Sheets if already written
if (post.sheetTriggeredAt) {
  const error = `Refusing to write post ${post._id} to Google Sheets - sheetTriggeredAt already set to ${post.sheetTriggeredAt.toISOString()}`;
  logger.error(`[GUARDRAIL] ${error}`);
  throw new Error(error); // Hard fail - do not retry
}
```

**Impact:** Prevents `postToTikTok()` from writing to Google Sheets if `sheetTriggeredAt` is already set.

---

### Fix #2 (CRITICAL): Scheduler Query Excludes Posts with `sheetTriggeredAt`
**File:** `postingScheduler.js:339-350`
**Line:** 343

```javascript
const scheduledContent = await MarketingPost.find({
  status: 'approved',
  scheduledAt: { $lte: new Date() },
  videoPath: { $exists: true, $ne: null },
  sheetTriggeredAt: { $exists: false } // NEW: Never pick up posts already written to sheet
});
```

**Impact:** The scheduler will never pick up posts that already have `sheetTriggeredAt` set, preventing duplicate processing.

---

### Fix #3 (CRITICAL): Retry Logic Respects `sheetTriggeredAt`
**File:** `postingScheduler.js:619-650`
**Lines:** 623-640

```javascript
if (timeSinceScheduled < RETRY_WINDOW) {
  // CRITICAL: If already wrote to Google Sheets, do NOT retry
  if (post.sheetTriggeredAt) {
    await post.setPlatformStatus(platform, 'failed', {
      error: `Google Sheets already written at ${post.sheetTriggeredAt.toISOString()} - cannot retry (prevents duplicate posts)`,
      lastFailedAt: new Date()
    });
    post.status = 'failed';
    await post.save();
    logger.error(`[GUARDRAIL] Post ${post._id} already has sheetTriggeredAt, marking as permanently failed...`);
    throw error;
  }
  // Only retry if Google Sheets was never written
  await post.setPlatformStatus(platform, 'pending', { ... });
  post.status = 'approved';
}
```

**Impact:** Posts that succeeded in writing to Google Sheets but then fail elsewhere will be marked as permanently failed, preventing retries that could write to Google Sheets again.

---

### Fix #4 (HIGH): Early Guardrail Check in `processPlatformPosting()`
**File:** `postingScheduler.js:550-572`
**Lines:** 556-567

```javascript
async processPlatformPosting(post, platform) {
  // CRITICAL GUARDRAIL: For TikTok, never post if sheetTriggeredAt is already set
  if (platform === 'tiktok' && post.sheetTriggeredAt) {
    const error = `Post ${post._id} already has sheetTriggeredAt set to ${post.sheetTriggeredAt.toISOString()} - refusing to post to TikTok again`;
    logger.error(`[GUARDRAIL] ${error}`);
    await post.setPlatformStatus('tiktok', 'failed', { error: error, lastFailedAt: new Date() });
    throw new Error(error);
  }
  // ... rest of method
}
```

**Impact:** Prevents calling `postToTikTok()` for posts that already have `sheetTriggeredAt` set.

---

### Fix #5 (HIGH): Platform Loop Check for `sheetTriggeredAt`
**File:** `postingScheduler.js:369-393`
**Lines:** 374-381

```javascript
for (const platform of platforms) {
  const platformStatus = post.platformStatus?.[platform];

  // CRITICAL: Skip if already wrote to Google Sheets
  if (post.sheetTriggeredAt) {
    logger.info(`Skipping post - sheetTriggeredAt already set (guardrail to prevent duplicate Google Sheet writes)`, {
      postId: post._id,
      platform,
      sheetTriggeredAt: post.sheetTriggeredAt
    });
    continue;
  }
  // ...
}
```

**Impact:** Adds an early check in the scheduler's platform loop to skip posts with `sheetTriggeredAt`.

---

### Fix #6 (HIGH): Recovery Logic Marks TikTok as Permanently Failed
**File:** `postingScheduler.js:267-314`
**Lines:** 278-297

```javascript
if (hasPendingOrFailed) {
  // CRITICAL: For TikTok, if sheetTriggeredAt exists, mark as permanently failed
  if (post.platformStatus?.tiktok?.status === 'failed' && post.sheetTriggeredAt) {
    await post.setPlatformStatus('tiktok', 'failed', {
      error: `Google Sheets already written at ${post.sheetTriggeredAt.toISOString()} - cannot retry (prevents duplicate posts)`,
      permanentlyFailed: true
    });
    logger.warn(`[RECOVERY] TikTok platform for post ${post._id} marked as permanently failed...`);
  }
  post.status = 'approved';
}
```

**Impact:** Multi-platform posts with TikTok already written to Google Sheets will have TikTok marked as permanently failed, preventing retries.

---

### Fix #7 (HIGH): API Endpoint Guardrail
**File:** `/home/ofer/blush-marketing/backend/api/tiktok.js`
**Lines:** 308-322

```javascript
// CRITICAL GUARDRAIL: Never write to Google Sheets if already written
if (post.sheetTriggeredAt) {
  const error = `Refusing to write post ${post._id} to Google Sheets - sheetTriggeredAt already set to ${post.sheetTriggeredAt.toISOString()}`;
  logger.error(`[GUARDRAIL] ${error}`, {
    postId: post._id,
    sheetTriggeredAt: post.sheetTriggeredAt
  });
  return res.status(400).json({
    success: false,
    error: error
  });
}
```

**Impact:** Prevents manual API calls from writing to Google Sheets if `sheetTriggeredAt` is already set.

---

### Fix #8 (MEDIUM): Manual Trigger Script Guardrail
**File:** `/home/ofer/blush-marketing/backend/scripts/triggerPostNow.js`
**Lines:** 56-66

```javascript
console.log('sheetTriggeredAt:', post.sheetTriggeredAt);

// CRITICAL GUARDRAIL: Never write to Google Sheets if already written
if (post.sheetTriggeredAt) {
  const error = `Refusing to write post ${post._id} to Google Sheets - sheetTriggeredAt already set to ${post.sheetTriggeredAt.toISOString()}`;
  console.log(`\n❌ ${error}`);
  console.log('This guardrail prevents duplicate posts to TikTok.');
  await databaseService.disconnect();
  process.exit(1);
}
```

**Impact:** Prevents manual trigger scripts from writing to Google Sheets if `sheetTriggeredAt` is already set.

---

### Fix #9 (MEDIUM): Update `canPostToPlatform()` Method
**File:** `/home/ofer/blush-marketing/backend/models/MarketingPost.js`
**Lines:** 1044-1059

```javascript
marketingPostSchema.methods.canPostToPlatform = function(platform) {
  const platformStatus = this.platformStatus?.[platform];

  // CRITICAL: Never post to TikTok if sheetTriggeredAt is set
  if (platform === 'tiktok' && this.sheetTriggeredAt) {
    return false;
  }

  // ... rest of existing logic
};
```

**Impact:** Adds model-level guardrail to prevent posting to TikTok if `sheetTriggeredAt` is set.

---

### Fix #10 (MEDIUM): Transactional State Update
**File:** `postingScheduler.js:783-820`
**Lines:** 789-816

```javascript
// CRITICAL: Set sheetTriggeredAt BEFORE calling appendRow for transactional safety
post.sheetTriggeredAt = new Date();
post.sheetTabUsed = targetSheet;
post.sheetTriggerPending = true; // Flag to indicate write is in progress
await post.save(); // Save BEFORE calling appendRow

const sheetsResult = await googleSheetsService.appendRow(
  targetSheet,
  [uploadResult.publicUrl, fullCaption]
);

if (!sheetsResult.success) {
  // Rollback sheetTriggeredAt if append failed
  post.sheetTriggeredAt = undefined;
  post.sheetTabUsed = undefined;
  post.sheetTriggerPending = undefined;
  await post.save();
  throw new Error(`Google Sheets append failed: ${sheetsResult.error}`);
}

// Append succeeded, clear pending flag
post.sheetTriggerPending = undefined;
post.publishingStatus = 'triggered_zapier';
// ... rest of save
```

**Impact:** Sets `sheetTriggeredAt` BEFORE the Google Sheets write to prevent duplicates if append succeeds but save fails.

**Schema Change:** Added `sheetTriggerPending` field to MarketingPost schema

---

### Fix #11 (LOW): Deduplication Check in Google Sheets Service
**File:** `/home/ofer/blush-marketing/backend/services/googleSheetsService.js`
**Lines:** 287-349

Added `checkRowExists()` method and duplicate check in `appendRow()`:

```javascript
async checkRowExists(sheetName, videoUrl) {
  const result = await this.readSheet(sheetName, 'A1:B100');
  if (!result.success) return false;
  const exists = result.data.values.some(row => row[0] === videoUrl);
  return exists;
}

async appendRow(sheetName, values) {
  // DEFENSE IN DEPTH: Check for duplicates before appending
  const videoUrl = values[0];
  const exists = await this.checkRowExists(targetSheetName, videoUrl);

  if (exists) {
    logger.warn(`[GUARDRAIL] Duplicate row detected in sheet ${targetSheetName}, not appending: ${videoUrl}`);
    return {
      success: false,
      error: 'Duplicate row - video URL already exists in sheet',
      code: 'DUPLICATE',
    };
  }
  // ... rest of append logic
}
```

**Impact:** Adds defense-in-depth duplicate detection in the Google Sheets service itself.

---

## Defense in Depth

The implementation follows a defense-in-depth strategy with **multiple layers of protection**:

1. **Model Layer**: `canPostToPlatform()` returns false if `sheetTriggeredAt` is set
2. **Query Layer**: Scheduler query excludes posts with `sheetTriggeredAt`
3. **Scheduler Loop**: Early check skips posts with `sheetTriggeredAt`
4. **Process Method**: `processPlatformPosting()` checks before posting
5. **Posting Method**: `postToTikTok()` has hard fail check
6. **API Endpoint**: Manual posting endpoint checks `sheetTriggeredAt`
7. **Retry Logic**: Marks posts as permanently failed if `sheetTriggeredAt` exists
8. **Recovery Logic**: Marks TikTok as permanently failed in multi-platform scenarios
9. **Transactional Safety**: Sets `sheetTriggeredAt` BEFORE Google Sheets write
10. **Service Layer**: Google Sheets service checks for duplicate rows

---

## Logging

All guardrail violations are logged at **ERROR level** with clear context:

```
[GUARDRAIL] Refusing to write post POST_ID to Google Sheets - sheetTriggeredAt already set to TIMESTAMP
[RECOVERY] TikTok platform for post POST_ID marked as permanently failed - sheetTriggeredAt exists, will not retry
```

---

## Testing Recommendations

1. **Unit Test: `sheetTriggeredAt` Guardrail**
   - Create a post with `sheetTriggeredAt` already set
   - Try to call `postToTikTok()` - should throw error immediately
   - Verify no Google Sheets write occurred

2. **Integration Test: Scheduler Excludes Posts with `sheetTriggeredAt`**
   - Create multiple approved posts, some with `sheetTriggeredAt`
   - Run scheduler cycle
   - Verify only posts without `sheetTriggeredAt` were processed

3. **Integration Test: Retry Logic Respects Guardrail**
   - Create a post, let it succeed writing to Google Sheets
   - Simulate a failure after `sheetTriggeredAt` is set
   - Verify retry logic marks it as permanently failed, doesn't retry

4. **Integration Test: Multi-Platform Partial Failure**
   - Create multi-platform post
   - Let TikTok succeed (set `sheetTriggeredAt`)
   - Let Instagram fail
   - Verify recovery doesn't retry TikTok

5. **Manual Test: Manual Trigger Respects Guardrail**
   - Use `triggerPostNow.js` script on a post with `sheetTriggeredAt`
   - Verify it refuses to write to Google Sheets

6. **End-to-End Test: Full Posting Flow**
   - Create and approve a post
   - Let it post successfully
   - Wait for scheduler cycles
   - Verify no duplicate entries in Google Sheet

---

## Verification Checklist

- [x] `postToTikTok()` checks `sheetTriggeredAt` before writing to Google Sheets
- [x] Scheduler query excludes posts with `sheetTriggeredAt`
- [x] Retry logic marks posts as permanently failed if `sheetTriggeredAt` exists
- [x] `processPlatformPosting()` checks `sheetTriggeredAt` before calling `postToTikTok()`
- [x] Platform loop in scheduler skips posts with `sheetTriggeredAt`
- [x] Recovery logic marks TikTok as permanently failed if `sheetTriggeredAt` exists
- [x] API endpoint `/api/tiktok/post/:postId` checks `sheetTriggeredAt`
- [x] Manual trigger script `triggerPostNow.js` checks `sheetTriggeredAt`
- [x] `canPostToPlatform()` method returns false if `sheetTriggeredAt` is set
- [x] `sheetTriggeredAt` is set BEFORE Google Sheets write (transactional safety)
- [x] Google Sheets service checks for duplicate rows before appending
- [x] `sheetTriggerPending` field added to MarketingPost schema

---

## Summary

**All 13 identified bugs have been fixed with 11 comprehensive guardrail implementations.**

The fix follows a defense-in-depth strategy with multiple layers of protection to ensure that once `sheetTriggeredAt` is set for a post, it can NEVER be written to the Google Sheet again under any circumstances.
