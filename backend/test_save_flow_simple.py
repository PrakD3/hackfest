#!/usr/bin/env python3
"""Simple test of Save Discovery flow"""

import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

print("\n" + "="*70)
print("TESTING: Save Discovery Flow (with AUTO_SAVE)")
print("="*70)

# Step 1: Check health
print("\n[1] Checking backend health...")
try:
    with urllib.request.urlopen(f"{BASE_URL}/api/health") as resp:
        data = json.loads(resp.read())
        print(f"✅ Backend alive: {data}")
except Exception as e:
    print(f"❌ Backend error: {e}")
    exit(1)

# Step 2: Create analysis
print("\n[2] Creating analysis session...")
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/analyze",
        data=json.dumps({"query": "EGFR L858R", "mode": "full"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        session_id = result["session_id"]
        print(f"✅ Session created: {session_id}")
except Exception as e:
    print(f"❌ Failed to create session: {e}")
    exit(1)

# Step 3: Wait for auto-save to complete (pipeline takes time)
print("\n[3] Waiting 20 seconds for pipeline to complete and auto-save...")
time.sleep(20)

# Step 4: Check if discovery was auto-saved
print("\n[4] Checking if discovery was auto-saved to database...")
try:
    with urllib.request.urlopen(f"{BASE_URL}/api/discoveries") as resp:
        discoveries = json.loads(resp.read())
        
        # Find discovery for this session
        matching = [d for d in discoveries if d.get("session_id") == session_id]
        if matching:
            d = matching[0]
            print(f"✅ Discovery auto-saved!")
            print(f"   ID: {d.get('id')}")
            print(f"   Session: {d.get('session_id')}")
            print(f"   Query: {d.get('query')}")
            print(f"   Created: {d.get('created_at')}")
        else:
            print(f"❌ No discovery found for session {session_id}")
            print(f"   Found {len(discoveries)} total discoveries")
            exit(1)
except Exception as e:
    print(f"❌ Error checking discoveries: {e}")
    exit(1)

print("\n" + "="*70)
print("✅ TEST PASSED - Save Discovery auto-save is working!")
print("="*70)
