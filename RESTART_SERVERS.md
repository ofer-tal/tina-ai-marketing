# Server Restart Instructions

## Critical Infrastructure Issue

Both the frontend and backend servers are currently non-functional due to stale processes.

## Symptoms

1. **Backend** (port 3001): Returns HTML "Blush Marketing Analytics" instead of JSON API responses
2. **Frontend** (port 3000): Connection timeouts

## Root Cause

- Stale node process running outdated/cached code
- Node process running since 17:35:04 without picking up new code changes
- Nodemon not properly detecting and reloading changes

## Solution

### Step 1: Kill All Node Processes

```bash
# Option A: Kill all node processes
pkill -9 node

# Option B: Kill specific processes (if above doesn't work)
ps aux | grep node
# Then kill each PID manually:
kill -9 <PID>
```

### Step 2: Verify No Processes Remain

```bash
ps aux | grep node
# Should return nothing (or only the grep command itself)
```

### Step 3: Start Fresh Development Servers

```bash
cd /c/Projects/blush-marketing
npm run dev
```

This will start:
- Backend server on port 3001 (via nodemon)
- Frontend server on port 3000 (via Vite)

### Step 4: Verify Servers Are Working

**Check Backend Health:**
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-12T...",
  "uptime": ...,
  "environment": "development",
  "database": {
    "connected": false,
    "readyState": "disconnected",
    ...
  }
}
```

**Check Settings API:**
```bash
curl http://localhost:3001/api/settings
```

Expected response:
```json
{
  "success": true,
  "settings": {
    "PORT": 3001,
    "NODE_ENV": "development",
    ...
  }
}
```

**Check Frontend:**
```bash
curl http://localhost:3000 | head -20
```

Expected response: HTML containing "Blush Marketing Operations Center"

### Step 5: Test Settings Page in Browser

1. Open browser to: http://localhost:3000
2. Navigate to: http://localhost:3000/settings
3. Verify: Settings page loads with all configuration categories

## What Was Fixed

**Vite Configuration** (vite.config.ts):
- Changed proxy target from `http://localhost:5000` to `http://localhost:3001`
- This ensures frontend API calls reach the correct backend port

## Prevention

To avoid this issue in the future:

1. **Always stop servers** before ending a coding session:
   ```bash
   # Press Ctrl+C in the terminal running npm run dev
   # Or use: pkill -9 node
   ```

2. **Check for stale processes** if APIs behave unexpectedly:
   ```bash
   ps aux | grep node
   ```

3. **Use nodemon's restart** feature when making backend changes:
   - Nodemon should auto-restart on file changes
   - If it doesn't, manually restart with Ctrl+C and `npm run dev:backend`

## Current Status

- ✅ Vite proxy configuration fixed
- ⚠️  Backend server needs restart (returning wrong content)
- ⚠️  Frontend server needs restart (timing out)
- 📝 Awaiting user to execute server restart

## After Restart

Once servers are restarted and verified:

1. Re-test Feature #4 (Settings page)
2. Run regression tests on Features #1-#5
3. Continue with Feature #6 (Logging system)

---

**Last Updated**: 2025-01-12
**Session**: Regression Investigation
**Status**: Awaiting User Action
