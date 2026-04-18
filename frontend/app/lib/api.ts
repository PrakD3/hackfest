<<<<<<< Updated upstream
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function startAnalysis(
  query: string,
  mode: "full" | "lite" = "full"
): Promise<{ session_id: string }> {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode }),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);
  return res.json();
}

export async function getSessionResult(sessionId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/api/molecules/${sessionId}`);
  if (res.status === 404) return { status: "not_found" };
  if (!res.ok) throw new Error(`Session fetch failed: ${res.statusText}`);
  return res.json();
}

export async function cancelAnalysis(sessionId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/api/cancel/${sessionId}`, { method: "POST" });
  if (!res.ok) throw new Error(`Cancel failed: ${res.statusText}`);
  return res.json();
}

export async function exportSession(
  sessionId: string,
  format: "json" | "sdf" | "pdf"
): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/export/${sessionId}?format=${format}`);
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  return res.blob();
}

export async function listDiscoveries(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${API_URL}/api/discoveries`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function saveDiscovery(sessionId: string): Promise<{ discovery_id: string }> {
  const res = await fetch(`${API_URL}/api/discoveries/${sessionId}/save`, { method: "POST" });
  if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
  return res.json();
}

export async function deleteDiscovery(id: string): Promise<void> {
  await fetch(`${API_URL}/api/discoveries/${id}`, { method: "DELETE" });
}

export async function getSystemStatus(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${API_URL}/api/system-status`);
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export function getDockedPoseUrl(sessionId: string, poseId: string): string {
  return `${API_URL}/api/docked-poses/${sessionId}/${poseId}`;
}

export function getStructureUrl(sessionId: string): string {
  return `${API_URL}/api/structure/${sessionId}`;
}

export async function listThemes(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${API_URL}/api/themes`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function searchMutations(
  query: string,
  source: "all" | "local" | "online" = "all"
): Promise<string[]> {
  try {
    const res = await fetch(
      `${API_URL}/api/search?query=${encodeURIComponent(query)}&source=${source}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.suggestions) ? data.suggestions : [];
  } catch {
    return [];
  }
}

export async function saveTheme(
  name: string,
  theme_json: Record<string, unknown>
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/themes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, theme_json }),
  });
  if (!res.ok) throw new Error("Theme save failed");
  return res.json();
}

export { API_URL };
=======
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function startAnalysis(
  query: string,
  mode: "full" | "lite" = "full"
): Promise<{ session_id: string }> {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode }),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);
  return res.json();
}

export async function getSessionResult(sessionId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/api/molecules/${sessionId}`);
  if (res.status === 404) return { status: "not_found" };
  if (!res.ok) throw new Error(`Session fetch failed: ${res.statusText}`);
  return res.json();
}

export async function cancelAnalysis(sessionId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/api/cancel/${sessionId}`, { method: "POST" });
  if (!res.ok) throw new Error(`Cancel failed: ${res.statusText}`);
  return res.json();
}

export async function exportSession(
  sessionId: string,
  format: "json" | "sdf" | "pdf"
): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/export/${sessionId}?format=${format}`);
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
  return res.blob();
}

export async function listDiscoveries(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${API_URL}/api/discoveries`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function saveDiscovery(sessionId: string): Promise<{ discovery_id: string }> {
  const res = await fetch(`${API_URL}/api/discoveries/${sessionId}/save`, { method: "POST" });
  if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
  return res.json();
}

export async function deleteDiscovery(id: string): Promise<void> {
  await fetch(`${API_URL}/api/discoveries/${id}`, { method: "DELETE" });
}

export async function getSystemStatus(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${API_URL}/api/system-status`);
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export function getDockedPoseUrl(sessionId: string, poseId: string): string {
  return `${API_URL}/api/docked-poses/${sessionId}/${poseId}`;
}

export function getStructureUrl(sessionId: string): string {
  return `${API_URL}/api/structure/${sessionId}`;
}

export async function listThemes(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${API_URL}/api/themes`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function saveTheme(
  name: string,
  theme_json: Record<string, unknown>
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/themes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, theme_json }),
  });
  if (!res.ok) throw new Error("Theme save failed");
  return res.json();
}

export { API_URL };
>>>>>>> Stashed changes
