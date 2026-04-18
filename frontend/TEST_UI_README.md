# Frontend Test UI

**This is a temporary test UI for backend verification only.**

## What It Does

Simple single-file HTML interface to test if the AXONENGINE v4 backend is working correctly:

- ✅ Search for protein mutations (e.g., "EGFR T790M")
- ✅ Real-time SSE event streaming
- ✅ Agent status grid (19 agents)
- ✅ Progress bar (0-100%)
- ✅ Event log display
- ✅ Results summary

## How to Use

### 1. Start Backend
```bash
cd backend
python -m uvicorn main:app --reload
# Running on http://localhost:8000
```

### 2. Open Test UI
```bash
# Open in any browser:
file:///c:/Projects/hackfest/frontend/test-ui.html
# Or use VS Code Live Server extension
```

### 3. Test Analysis
- Enter mutation: `EGFR T790M`
- Click "Start Analysis"
- Watch SSE events stream in real-time
- Results display when pipeline completes

## What to Look For

**Success Indicators:**
- ✅ Agent status cards show COMPLETE (green border)
- ✅ Progress bar reaches 100%
- ✅ Results section displays top 2 finalists
- ✅ Execution time shows < 20 seconds
- ✅ No error badges in agent grid

**Troubleshooting:**
- Error: "Cannot connect to localhost:8000" → Backend not running
- Error: "CORS error" → Check CORS settings in backend main.py
- Missing agent cards → Backend not returning agent_statuses

## Important

**This test UI is NOT part of the final deliverable.**

- ❌ Do NOT commit this file to main branches
- ❌ This is for development/testing only
- ❌ Real frontend will be built by frontend team

The file is in `.gitignore` so it won't be committed accidentally.

## For Frontend Team

When you build the real Next.js frontend:
1. Reference `FRONTEND_ARCHITECTURE.md` for specifications
2. Look at this test UI's event handling for SSE streaming pattern
3. Delete `test-ui.html` once real UI is ready
4. Follow the 4-page layout documented in FRONTEND_ARCHITECTURE.md

---

**Status:** Temporary development tool ⚙️
**Delete:** When real frontend is ready ✨
