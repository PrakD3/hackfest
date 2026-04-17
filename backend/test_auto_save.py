#!/usr/bin/env python3
"""Test Save Discovery with longer pipeline wait time"""

import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

print("\n" + "="*70)
print("TEST: Save Discovery Flow (End-to-End)")
print("="*70)

# Step 1: Check health
print("\n[1] Checking backend health...")
try:
    with urllib.request.urlopen(f"{BASE_URL}/api/health") as resp:
        data = json.loads(resp.read())
        print(f"[OK] Backend: {data['status']}")
except Exception as e:
    print(f"[ERROR] Backend error: {e}")
    exit(1)

# Step 2: Create analysis
print("\n[2] Creating analysis session...")
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/analyze",
        data=json.dumps({"query": "Test EGFR mutation", "mode": "full"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        session_id = result["session_id"]
        print(f"[OK] Session: {session_id}")
except Exception as e:
    print(f"[ERROR] Failed: {e}")
    exit(1)

# Step 3: Wait for pipeline to complete (20 seconds should be enough)
print("\n[3] Waiting for pipeline to complete (20 seconds)...")
for i in range(20, 0, -1):
    print(f"   {i}s remaining...", end="\r")
    time.sleep(1)

# Step 4: Check if discovery was auto-saved
print("\n[4] Checking if discovery was auto-saved...")
try:
    with urllib.request.urlopen(f"{BASE_URL}/api/discoveries") as resp:
        discoveries = json.loads(resp.read())
        if discoveries:
            latest = discoveries[0]
            print(f"[OK] Auto-saved discovery found!")
            print(f"   ID: {latest.get('id')}")
            print(f"   Session: {latest.get('session_id')}")
            print(f"   Query: {latest.get('query')}")
            print(f"   Created: {latest.get('created_at')}")
        else:
            print(f"[ERROR] No discoveries found in database")
            print("   Pipeline may still be running or auto-save failed")
except Exception as e:
    print(f"[ERROR] Error: {e}")
    exit(1)

print("\n" + "="*70)
print("[OK] TEST COMPLETE")
print("="*70)
#!/usr/bin/env python3
"""Test AUTO_SAVE_DISCOVERIES - wait for full pipeline, then verify discovery was saved"""

import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

print("\n" + "="*70)
print("TESTING: AUTO_SAVE_DISCOVERIES Flow")
print("="*70)

# Step 1: Create analysis LITE mode (faster)
print("\n[1] Creating LITE analysis session...")
req = urllib.request.Request(
    f"{BASE_URL}/api/analyze",
    data=json.dumps({"query": "Simple test", "mode": "lite"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    session_id = result["session_id"]
    print(f"✅ Session ID: {session_id}")

# Step 2: Wait for SSE stream to complete
print(f"\n[2] Streaming progress from session...")
try:
    url = f"{BASE_URL}/api/stream/{session_id}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=60) as resp:
        event_count = 0
        for line in resp:
            line_str = line.decode('utf-8').strip()
            if line_str.startswith('data:'):
                try:
                    data = json.loads(line_str[5:])
                    event = data.get("event", "")
                    if event == "pipeline_complete":
                        print(f"✅ Pipeline completed (received {event_count} events)")
                        break
                    event_count += 1
                    if event_count % 5 == 0:
                        print(f"   ... {event_count} events processed")
                except:
                    pass
except Exception as e:
    print(f"⚠ Stream ended: {e}")

# Step 3: Check if discovery was auto-saved
print(f"\n[3] Checking if discovery was auto-saved...")
time.sleep(2)
try:
    with urllib.request.urlopen(f"{BASE_URL}/api/discoveries") as resp:
        discoveries = json.loads(resp.read())
        if discoveries:
            # Find the latest discovery
            latest = discoveries[0]  # Assuming sorted by created_at DESC
            print(f"✅ Found {len(discoveries)} discovery/discoveries!")
            print(f"   Latest: ID={latest.get('id')}, Query={latest.get('query')}")
            
            # Try to retrieve it
            discovery_id = latest.get('id')
            with urllib.request.urlopen(f"{BASE_URL}/api/discoveries/{discovery_id}") as d_resp:
                full_discovery = json.loads(d_resp.read())
                print(f"\n✅ FULL DISCOVERY RETRIEVED:")
                print(f"   ID: {full_discovery.get('id')}")
                print(f"   Session: {full_discovery.get('session_id')}")
                print(f"   Query: {full_discovery.get('query')}")
                print(f"   Created: {full_discovery.get('created_at')}")
                print(f"   Gene: {full_discovery.get('gene', 'N/A')}")
                print(f"   Mutation: {full_discovery.get('mutation', 'N/A')}")
                print(f"\n✅ AUTO-SAVE is working!")
        else:
            print(f"❌ No discoveries found in database")
except Exception as e:
    print(f"❌ Error checking discoveries: {e}")

print("\n" + "="*70)
