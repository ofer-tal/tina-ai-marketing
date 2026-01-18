# Next Session Quick Start Guide

## Immediate Actions (Do This First!)

### 1. Restart Backend Server

```bash
./restart_backend.sh
```

Or manually:
```bash
npm run dev:backend
```

### 2. Verify Restart Worked

```bash
curl http://localhost:3001/api/health
```

Look for: `"uptimeHuman": "0m XXs"` (less than 1 minute)

---

## Features Ready to Test

### ✅ Feature #178: Todo Snooze (Code Complete)

**File:** `frontend/src/pages/Todos.jsx`

**Test Steps:**
1. Go to http://localhost:5173/todos
2. Click a pending todo
3. Click "⏰ Snooze" button
4. Select time in modal
5. Click "✅ Confirm Snooze"
6. Verify todo status = "snoozed"

**Expected:** Todo moves to snoozed, scheduled time updates

**Mark Passing:** `feature_mark_passing(178)`

---

### ✅ Feature #183: Todo History (Code Complete)

**File:** `frontend/src/pages/Todos.jsx`

**Test Steps:**
1. Go to http://localhost:5173/todos
2. Filter by "Completed"
3. Verify completed todos show: "✅ Completed Jan 15, 2026"
4. Click a completed todo
5. Verify detail modal shows: "Completed: 1/15/2026, 2:30:45 PM"

**Expected:** Completion dates visible in cards and detail modal

**Mark Passing:** `feature_mark_passing(183)`

---

### ✅ Feature #176: Completion Checkbox (Code Complete)

**File:** `frontend/src/pages/Todos.jsx`

**Test Steps:**
1. Go to http://localhost:5173/todos
2. Find checkbox on todo card
3. Click checkbox
4. Verify PUT /api/todos/:id works
5. Verify todo status = "completed"
6. Verify todo moves to completed section

**Expected:** No "require is not defined" error

**Mark Passing:** `feature_mark_passing(176)`

---

### ✅ Feature #177: Status Tracking (Code Complete)

**File:** `frontend/src/pages/Todos.jsx`

**Test Steps:**
1. Go to http://localhost:5173/todos
2. Click a todo
3. Change status in dropdown
4. Verify PUT /api/todos/:id works
5. Verify status changes
6. Verify badge updates

**Expected:** All 5 statuses work (pending, in_progress, completed, cancelled, snoozed)

**Mark Passing:** `feature_mark_passing(177)`

---

## Feature to Implement

### ⏳ Feature #179: Todo Deletion

**Backend:** DELETE endpoint exists at `backend/api/todos.js:357`

**Need to Add:**
1. Delete button in todo detail modal
2. Confirmation dialog
3. Call to DELETE /api/todos/:id
4. Refresh todos after delete

**Location:** Add to `frontend/src/pages/Todos.jsx` detail modal ButtonGroup

**Example Code:**
```jsx
<Button
  onClick={async () => {
    if (confirm('Are you sure you want to delete this todo?')) {
      try {
        const response = await fetch(`http://localhost:3001/api/todos/${selectedTodo.id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchTodos();
          setShowDetailModal(false);
        }
      } catch (error) {
        console.error('Error deleting todo:', error);
      }
    }
  }}
  style={{ background: '#f8312f' }}
>
  🗑️ Delete
</Button>
```

---

## Progress Tracking

**Current:** 329/338 (97.3%)
**After Testing #176, #177, #178, #183:** 333/338 (98.5%)
**After Implementing #179:** 334/338 (98.8%)
**Remaining:** 4 features

---

## Git Commands

### After Testing All Features:
```bash
git add .
git commit -m "Session 2026-01-18 part 2: Verified features #176, #177, #178, #183

- Tested todo completion checkbox (Feature #176)
- Tested todo status tracking (Feature #177)
- Tested todo snooze functionality (Feature #178)
- Tested todo history/archive (Feature #183)
- All features verified with browser automation
- Screenshots captured

Progress: 333/338 (98.5%)
"
```

---

## Quick Reference: Feature IDs

- #176: Todo completion checkbox
- #177: Todo status tracking
- #178: Todo snooze and reschedule
- #179: Todo deletion
- #183: Todo history and archive

---

## Troubleshooting

### "require is not defined" Error
**Cause:** Backend not restarted
**Fix:** Run `./restart_backend.sh`

### PUT Request Fails
**Cause:** ObjectId not being used
**Fix:** Restart backend to pick up ES module fixes

### Frontend Won't Start
**Cause:** Port already in use
**Fix:**
```bash
pkill -f "vite"
npm run dev:frontend
```

### Can't Take Screenshots
**Cause:** Browser automation not connected
**Fix:** Start frontend and backend servers first

---

## Success Criteria

After this session:
- ✅ Backend server restarted
- ✅ Features #176, #177, #178, #183 tested and passing
- ✅ Feature #179 implemented and passing
- ✅ All changes committed to git
- ✅ Progress: 334/338 (98.8%)

---

## Time Estimate

- Backend restart: 2 minutes
- Test #176: 5 minutes
- Test #177: 5 minutes
- Test #178: 10 minutes
- Test #183: 5 minutes
- Implement #179: 15 minutes
- Test #179: 5 minutes
- Git commit: 2 minutes

**Total:** ~50 minutes

---

**Goal:** Reach 334/338 features passing (98.8%)
**Next:** 4 remaining features
**Target:** 100% completion within 2 sessions

Good luck! 🚀
