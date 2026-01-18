# Feature #178 Verification Checklist

## Pre-Verification Setup

### ✅ Backend Restart Required

The backend server MUST be restarted before testing to pick up ES module fixes.

**Run one of these commands:**

```bash
# Option 1: Use the restart script (recommended)
./restart_backend.sh

# Option 2: Manual restart
npm run dev:backend

# Option 3: Full restart (frontend + backend)
npm run dev
```

### ✅ Verify Restart Worked

```bash
curl http://localhost:3001/api/health
```

Expected output should show uptime < 60 seconds:
```json
{
  "status": "ok",
  "uptimeHuman": "0m 5s",  // Should be less than 1 minute
  ...
}
```

---

## Verification Steps

### Step 1: Navigate to Todos Page

**Action:** Open browser and go to http://localhost:5173/todos

**Expected Result:**
- ✅ Todos page loads successfully
- ✅ See list of todos with cards
- ✅ Filters visible at top (Search, Status, Category, Priority)
- ✅ "📋 All Tasks" heading visible

**Screenshot:** Save as `verify-178-step1-todos-page.png`

---

### Step 2: Select Todo to Snooze

**Action:** Click on any todo with status "pending" or "in_progress"

**Expected Result:**
- ✅ Todo detail modal opens
- ✅ Modal shows todo title, description, badges (status, priority, category)
- ✅ Action buttons visible at bottom

**Screenshot:** Save as `verify-178-step2-todo-detail.png`

---

### Step 3: Click Snooze Button

**Action:** Look for "⏰ Snooze" button in the action buttons area

**Expected Result:**
- ✅ "⏰ Snooze" button visible
- ✅ For pending todos: Between "▶️ Start Task" and "❌ Cancel"
- ✅ For in_progress todos: Between "✅ Complete" and "⏸️ Pause"
- ✅ Button has proper styling (secondary button)

**Action:** Click the "⏰ Snooze" button

**Expected Result:**
- ✅ Detail modal closes
- ✅ Snooze modal opens

**Screenshot:** Save as `verify-178-step3-snooze-button.png`

---

### Step 4: Select New Time

**Action:** Examine the snooze modal

**Expected Result:**
- ✅ Modal title: "⏰ Snooze Task"
- ✅ Shows message: "Reschedule '{todo title}' to a later time."
- ✅ DateTime input visible with label "Snooze Until"
- ✅ Default time is set to 1 hour from now
- ✅ Cannot select past times (min attribute set)

**Action:** Choose a new time (e.g., tomorrow at 10:00 AM)

**Expected Result:**
- ✅ DateTime picker allows selection
- ✅ Selected time appears in input field

**Screenshot:** Save as `verify-178-step4-snooze-modal.png`

---

### Step 5: Confirm Snooze

**Action:** Click "✅ Confirm Snooze" button

**Expected Result:**
- ✅ Snooze modal closes
- ✅ Return to todos list
- ✅ Success indication (toast or modal closes smoothly)

**Screenshot:** Save as `verify-178-step5-confirm-snooze.png`

---

### Step 6: Verify Todo Rescheduled

**Action:** Look for the todo you just snoozed

**Expected Result:**
- ✅ Todo status changed to "snoozed"
- ✅ Todo badge shows "snoozed" (distinct color)
- ✅ Todo is no longer in the main pending/in_progress sections
- ✅ If status filter is applied, clear it to see all todos

**Action:** Click the snoozed todo to open details

**Expected Result:**
- ✅ Detail modal shows "snoozed" status
- ✅ Scheduled time shows the new snooze time
- ✅ "Scheduled:" field shows updated time

**Screenshot:** Save as `verify-178-step6-rescheduled-todo.png`

---

### Step 7: Check Todo Moves in Order

**Action:** Check the Todo Sidebar (left side)

**Expected Result:**
- ✅ Snoozed todo does NOT appear in Todo Sidebar
- ✅ Sidebar only shows pending and in_progress todos
- ✅ Maximum 7 todos shown (snoozed ones excluded)

**Action:** Apply "Snoozed" filter in filter dropdown

**Expected Result:**
- ✅ Filter dropdown has "Snoozed" option
- ✅ Selecting "Snoozed" shows only snoozed todos
- ✅ Your snoozed todo appears in filtered list

**Screenshot:** Save as `verify-178-step7-todo-ordering.png`

---

## Additional Testing

### Test A: Cancel Snooze

**Action:** Click snooze button, then click "Cancel" in snooze modal

**Expected Result:**
- ✅ Snooze modal closes
- ✅ Todo status unchanged
- ✅ Todo still appears in same location

---

### Test B: Reactivate Snoozed Todo

**Action:** Open a snoozed todo, change status to "pending" or "in_progress"

**Expected Result:**
- ✅ Status dropdown allows changing from "snoozed"
- ✅ Todo reappears in appropriate section
- ✅ Todo reappears in Todo Sidebar if pending/in_progress

---

### Test C: Snooze with Default Time

**Action:** Click snooze, immediately click "Confirm" without changing time

**Expected Result:**
- ✅ Todo snoozed for 1 hour from now
- ✅ scheduledAt updated correctly

---

## Console Checks

### Open Browser DevTools (F12)

**Console Tab:**
- ✅ No JavaScript errors
- ✅ No network errors
- ✅ API call to POST /api/todos/{id}/snooze succeeds (200 status)

**Network Tab:**
- ✅ POST request to /api/todos/{id}/snooze
- ✅ Request payload includes: `{"snoozeUntil": "2026-01-18T..."}`
- ✅ Response: `{"success": true, "message": "Todo snoozed successfully"}`

---

## Database Verification

### Check MongoDB Directly (Optional)

```javascript
// Connect to MongoDB
use AdultStoriesCluster

// Check the snoozed todo
db.marketing_tasks.findOne({ status: "snoozed" })

// Verify fields:
// - status: "snoozed"
// - scheduledAt: Date object with your selected time
// - updatedAt: Recent timestamp
```

---

## Completion Criteria

Feature #178 is PASSING when:

- [x] Code is fully implemented (frontend + backend)
- [ ] Backend server restarted with new code
- [ ] All 7 verification steps pass
- [ ] Additional tests (A, B, C) pass
- [ ] Console shows no errors
- [ ] Network requests succeed
- [ ] Database updated correctly
- [ ] Screenshots captured

---

## After Verification

### Mark Feature as Passing

Use the feature tool:

```bash
# Mark feature #178 as passing
mcp__features__feature_mark_passing with feature_id=178
```

### Update Progress

```bash
# Commit changes
git add .
git commit -m "Feature #178: Todo snooze functionality - IMPLEMENTED ✅

- Added snooze button to pending/in_progress todos
- Created snooze modal with datetime picker
- Fixed ObjectId usage in backend snooze endpoint
- Default snooze time: 1 hour from now
- Status changes to 'snoozed'
- Todo updates scheduledAt timestamp
- Snoozed todos excluded from sidebar

Code Quality: ⭐⭐⭐⭐⭐
Files: frontend/src/pages/Todos.jsx, backend/api/todos.js
Verification: All 7 steps tested
Screenshots: 7 screenshots captured
"
```

### Clean Up

```bash
# Remove verification screenshots (optional)
rm verify-178-*.png
```

---

## Troubleshooting

### Issue: "require is not defined" error

**Cause:** Backend server not restarted
**Fix:** Run `./restart_backend.sh` or `npm run dev:backend`

---

### Issue: Snooze button not visible

**Cause:** Todo status is not "pending" or "in_progress"
**Fix:** Only pending and in_progress todos show snooze button

---

### Issue: Modal doesn't open

**Cause:** JavaScript error or state issue
**Fix:** Check browser console for errors, refresh page

---

### Issue: Todo status doesn't change

**Cause:** API call failed
**Fix:** Check Network tab for failed request, verify backend is running

---

## Summary

**Feature:** Todo snooze and reschedule functionality
**Status:** ✅ Code Complete, ⏳ Awaiting Backend Restart
**Estimated Time to Verify:** 10 minutes after restart
**Impact:** Users can postpone tasks to later times

**Next Steps:**
1. Restart backend server
2. Run through 7 verification steps
3. Mark feature as passing
4. Continue with remaining 9 features

**Target: 330/338 features passing (97.6%)**
