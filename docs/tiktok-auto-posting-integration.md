# TikTok Auto-Posting Integration

## Overview

This document describes the TikTok auto-posting system using AWS S3, Google Sheets, Zapier, and Buffer. The system enables automated TikTok posting without direct API integration.

## Architecture

```
[MarketingPost DB] → [S3 Uploader] → [Google Sheets] → [Zapier] → [Buffer] → [TikTok]
                                      ↓
                               [Public URL]
```

### Flow Description

1. **S3 Uploader**: Video files are uploaded to AWS S3 for public hosting
2. **Google Sheets**: A new row is appended with video URL and caption
3. **Zapier**: Monitors the Google Sheet for new rows
4. **Buffer**: Receives data from Zapier and queues the post
5. **TikTok**: Buffer posts the video to TikTok

### Components

| Component | File | Purpose |
|-----------|------|---------|
| S3 Video Uploader | `backend/services/s3VideoUploader.js` | Uploads videos to AWS S3 |
| Google Sheets Service | `backend/services/googleSheetsService.js` | Manages Google OAuth and Sheets API |
| Posting Scheduler | `backend/jobs/postingScheduler.js` | Orchestrates the posting flow |
| TikTok Video Matcher | `backend/jobs/tikTokVideoMatcher.js` | Matches TikTok videos to DB posts |
| Content Metrics Sync | `backend/jobs/contentMetricsSyncJob.js` | Syncs video metrics |

---

## Environment Variables

### AWS S3 Configuration

```bash
# AWS S3 (for public video hosting)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_S3_REGION=us-east-1

# Optional: Custom CloudFront domain (default: content.blush.v6v.one)
AWS_CLOUDFRONT_DOMAIN=content.blush.v6v.one
```

### Google Sheets Configuration

```bash
# Google Sheets (reusing existing YouTube OAuth credentials)
# Spreadsheet ID from URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here

# Comma-separated list of sheet names (one per Zapier account)
GOOGLE_SHEETS_TAB_NAMES=Sheet1,Sheet2,Sheet3

# Test sheet name for development (NOT used for Zapier triggers)
GOOGLE_SHEETS_TEST_TAB=tests

# Development mode - if true, routes writes to test sheet instead of production
GOOGLE_SHEETS_DEV_MODE=true
```

**Note:** Google OAuth reuses existing YouTube credentials:
- `YOUTUBE_CLIENT_ID` - OAuth client ID
- `YOUTUBE_CLIENT_SECRET` - OAuth client secret
- `YOUTUBE_REDIRECT_URI` - OAuth callback URL

---

## Google OAuth Setup

The system **reuses your existing YouTube Google OAuth credentials**. No new Google Cloud project is needed!

### Step 1: Enable Google Sheets API (if not already enabled)

1. Go to https://console.cloud.google.com/
2. Select your existing project (the one with YouTube credentials)
3. In the left sidebar, go to "APIs & Services" → "Library"
4. Search for "Google Sheets API"
5. Click on it and press "ENABLE"

### Step 2: Verify OAuth Scopes

The following scope is required:
- `https://www.googleapis.com/auth/spreadsheets` - Read/write access to spreadsheets

Your existing OAuth consent screen should already be configured.

### Step 3: Get Spreadsheet ID

1. Open your Google Sheet in browser
2. Look at URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`
3. Copy the long ID between `/d/` and `/edit`
4. Add to `.env` as `GOOGLE_SHEETS_SPREADSHEET_ID`

### Step 4: Configure Sheet Names

1. In your Google Sheet, identify the tabs at the bottom
2. Default is "Sheet1", "Sheet2", etc.
3. Add comma-separated names to `.env` as `GOOGLE_SHEETS_TAB_NAMES`
4. Example: `GOOGLE_SHEETS_TAB_NAMES=Sheet1,Sheet2,Sheet3`
5. Add test sheet: `GOOGLE_SHEETS_TEST_TAB=tests`

### Step 5: Test OAuth Flow

1. Start backend server
2. Visit Settings page in frontend
3. Click "Connect Google Sheets"
4. Authorize with Google (uses existing YouTube credentials)
5. Connection status should show "Connected"

---

## S3 Setup

### Bucket Configuration

1. Create an S3 bucket for video hosting
2. Enable public read access (or configure CloudFront)
3. Set up CORS if needed:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### IAM User Permissions

The IAM user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/marketing/videos/*"
    }
  ]
}
```

---

## Zapier Setup

### Zap Configuration

Create a new Zap with:

**Trigger:**
- App: Google Sheets
- Trigger: New Spreadsheet Row
- Spreadsheet: Your marketing spreadsheet
- Worksheet: Select your production sheet (e.g., Sheet1)
- Trigger Column: Column A

**Action:**
- App: Buffer
- Action: Create Video Post
- Video URL: Use Column A (Video URL)
- Caption: Use Column B (Caption with hashtags)
- Channel: Select your TikTok channel

### Expected Row Format

| Column A | Column B |
|----------|----------|
| Video URL | Caption with hashtags |

Example:
- Column A: `https://content.blush.v6v.one/marketing/videos/post123_1234567890_abc123.mp4`
- Column B: `Check out this amazing story! 🔥\n\n#blush #stories #romance`

---

## Development Mode

Set `GOOGLE_SHEETS_DEV_MODE=true` to safely test without triggering Zapier:

- All writes go to the test sheet (`GOOGLE_SHEETS_TEST_TAB`)
- Production sheets are never written to
- Zapier is not triggered
- Safe for development and testing

---

## Database Schema Changes

### MarketingPost Model

New fields added:

```javascript
// S3/CloudFront hosting
s3Url: String,
s3Key: String,

// Sheet trigger tracking
sheetTabUsed: String,
sheetTriggeredAt: Date,

// TikTok publishing via Buffer
bufferPostId: String,

// Publishing status tracking
publishingStatus: {
  type: String,
  enum: ['pending_upload', 'uploaded_to_s3', 'triggered_zapier', 'posted_to_buffer', 'posted_to_tiktok', 'failed'],
},
publishingError: String,
```

### AuthToken Model

Added `'google'` to platform enum for storing Google OAuth tokens.

---

## Jobs

### TikTok Video Matcher Job

**File**: `backend/jobs/tikTokVideoMatcher.js`
**Schedule**: Every 30 minutes (configurable via `TIKTOK_MATCHER_SCHEDULE`)

Matches newly posted TikTok videos to database posts by:
1. Fetching all videos from TikTok API
2. Comparing timestamps (within 1 hour) and captions (first 100 characters)
3. Updating posts with `tiktokVideoId`, `tiktokShareUrl`, `status = 'posted'`
4. Updating metrics for already-matched posts

### Content Metrics Sync Job

**File**: `backend/jobs/contentMetricsSyncJob.js`
**Schedule**: Every 2 hours

Syncs performance metrics from TikTok:
- Views, likes, comments, shares
- Stores in `performanceMetrics` field
- Tracks history in `metricsHistory` array

---

## API Endpoints

### Google Sheets API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/google/authorize-url` | GET | Get OAuth authorization URL |
| `/api/google/connection-status` | GET | Get current connection status |
| `/api/google/test-connection` | GET | Test API connection |
| `/api/google/sheets` | GET | List all sheets in spreadsheet |
| `/api/google/spreadsheet` | GET | Get spreadsheet metadata |
| `/api/google/read/:sheetName` | GET | Read data from a sheet |
| `/api/google/append/:sheetName` | POST | Append a row to a sheet |

### OAuth Callback

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google/callback` | GET | OAuth callback handler |

---

## Testing Procedure

### 1. S3 Access Test

```bash
curl http://localhost:3001/api/s3/health
```

Expected response:
```json
{
  "success": true,
  "service": "s3-video-uploader",
  "enabled": true,
  "bucketName": "your-bucket-name"
}
```

### 2. Google OAuth Test

1. Visit Settings page
2. Click "Connect Google Sheets"
3. Complete OAuth flow
4. Verify connection status shows "Connected"

### 3. Sheets Read Test

```bash
curl http://localhost:3001/api/google/sheets
```

Expected response:
```json
{
  "success": true,
  "sheets": [
    { "sheetId": 0, "title": "Sheet1", "index": 0 },
    { "sheetId": 123456789, "title": "tests", "index": 1 }
  ]
}
```

### 4. Sheets Write Test (Use "tests" tab)

```bash
curl -X POST http://localhost:3001/api/google/append/tests \
  -H "Content-Type: application/json" \
  -d '{"values": ["test_url", "test caption"]}'
```

### 5. End-to-End Test

1. Ensure `GOOGLE_SHEETS_DEV_MODE=true`
2. Create a test MarketingPost with status 'scheduled'
3. Wait for posting scheduler to run (every 15 minutes)
4. Verify:
   - Video uploaded to S3
   - Row appended to "tests" sheet
   - Post status updated to 'scheduled'
   - `publishingStatus = 'triggered_zapier'`

---

## Troubleshooting

### Issue: "S3 uploading is disabled"

**Cause**: Missing AWS credentials

**Solution**:
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Check credentials have S3 permissions

### Issue: "Google Sheets not connected"

**Cause**: OAuth not completed or tokens expired

**Solution**:
- Click "Connect Google Sheets" in Settings
- Verify YouTube OAuth credentials are valid
- Check browser console for OAuth errors

### Issue: "Row not appearing in sheet"

**Cause**: Dev mode enabled, wrong sheet, or API error

**Solution**:
- Check `GOOGLE_SHEETS_DEV_MODE` setting
- Verify sheet name matches tab name exactly
- Check backend logs for errors

### Issue: "Zapier not triggering"

**Cause**: Wrong worksheet selected or trigger not active

**Solution**:
- Verify Zap is using the correct worksheet
- Check Zap is turned on
- Test Zap with manual row addition

### Issue: "Videos not matching after posting"

**Cause**: Time mismatch or caption differences

**Solution**:
- Check server timezone matches TikTok timezone
- Verify caption matching logic in `tikTokVideoMatcher.js`
- Manually match via admin panel if needed

---

## Migration from Direct TikTok API

The system maintains backward compatibility with direct TikTok posting:

1. If S3 or Google Sheets is not configured, the system falls back to direct TikTok API
2. The `postToTikTokDirect()` method handles direct posting
3. Existing posts continue to work without changes

---

## Security Considerations

1. **S3 Credentials**: Store in `.env` file, never commit to git
2. **Google Tokens**: Encrypted at rest in database, auto-expire
3. **Dev Mode**: Always use `GOOGLE_SHEETS_DEV_MODE=true` in development
4. **Sheet Access**: Limit sheet sharing to necessary users only
5. **Video URLs**: Public but expire via S3 lifecycle policies (recommended)

---

## Performance Notes

- **S3 Upload**: ~1-5 seconds per video (depends on size)
- **Sheet Append**: ~0.5-1 second
- **Zapier→Buffer→TikTok**: Up to 30 minutes
- **Video Matching**: ~5-10 seconds per 100 videos

---

## Future Enhancements

1. **Multiple Buffer Accounts**: Support for multiple TikTok accounts
2. **Direct Buffer API**: Skip Zapier for faster posting
3. **Video Transcoding**: Optimize videos for TikTok specs
4. **Caption Templates**: Pre-defined caption formats
5. **Analytics Dashboard**: Track Buffer/Zapier success rates
