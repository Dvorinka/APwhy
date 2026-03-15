import type {
  ApiKeyItem,
  AuthUser,
  BootstrapStatus,
  DatabaseItem,
  DeploymentItem,
  DeployRuntimeStatus,
  HealthStatus,
  PermissionItem,
  RoleItem,
  ServiceItem,
  UserItem,
} from "./types";

function normalizeDeploymentItem(raw: any): DeploymentItem {
  return {
    id: raw?.id || "",
    name: raw?.name || "",
    status: raw?.status || "",
    buildSystem: raw?.build_system || raw?.buildSystem,
    detectedProviders: raw?.detected_providers || raw?.detectedProviders || [],
    logs: raw?.logs,
    url: raw?.url,
    routePrefix: raw?.route_prefix || raw?.routePrefix,
    publicUrl: raw?.public_url || raw?.publicUrl,
    serviceId: raw?.service_id || raw?.serviceId,
    error: raw?.error,
    createdAt: raw?.created_at || raw?.createdAt || "",
    updatedAt: raw?.updated_at || raw?.updatedAt || "",
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    console.log(`API Request: ${path}`, init);
    response = await fetch(path, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      ...init,
      signal: controller.signal,
    });
    console.log(`API Response: ${path}`, response.status, response.statusText);
  } catch (err) {
    console.error(`API Error: ${path}`, err);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Check API/database connectivity.");
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));
  console.log(`API Payload: ${path}`, payload);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed (${response.status})`);
  }
  return payload as T;
}

export async function fetchBootstrapStatus(): Promise<BootstrapStatus> {
  const payload = await request<{ ok: boolean; data: BootstrapStatus }>("/api/v1/bootstrap/status");
  return payload.data;
}

export async function registerOwner(email: string, password: string) {
  return request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const payload = await request<{ ok: boolean; data: { user: AuthUser } }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return payload.data.user;
}

export async function me(): Promise<AuthUser> {
  const payload = await request<{ ok: boolean; data: AuthUser }>("/api/v1/auth/me");
  return payload.data;
}

export async function logout() {
  return request("/api/v1/auth/logout", { method: "POST" });
}

export async function resetPassword(newPassword: string) {
  return request("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
}

export async function listServices(): Promise<ServiceItem[]> {
  const payload = await request<{ ok: boolean; data: ServiceItem[] }>("/api/v1/services");
  return payload.data;
}

export async function createService(input: Record<string, unknown>) {
  return request("/api/v1/services", { method: "POST", body: JSON.stringify(input) });
}

export async function patchService(id: string, patch: Record<string, unknown>) {
  return request(`/api/v1/services/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function validateService(id: string) {
  return request(`/api/v1/services/${id}/validate`, { method: "POST" });
}

export async function listDatabases(): Promise<DatabaseItem[]> {
  const payload = await request<{ ok: boolean; data: DatabaseItem[] }>("/api/v1/databases");
  return payload.data;
}

export async function createDatabase(input: Record<string, unknown>) {
  return request("/api/v1/databases", { method: "POST", body: JSON.stringify(input) });
}

export async function patchDatabase(id: string, patch: Record<string, unknown>) {
  return request(`/api/v1/databases/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function validateDatabase(id: string) {
  return request(`/api/v1/databases/${id}/validate`, { method: "POST" });
}

export async function listKeys(): Promise<ApiKeyItem[]> {
  const payload = await request<{ ok: boolean; data: ApiKeyItem[] }>("/api/v1/keys");
  return payload.data;
}

export async function createKey(input: Record<string, unknown>) {
  return request<{ ok: boolean; data: { key: string; item: ApiKeyItem } }>("/api/v1/keys", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function patchKey(id: string, patch: Record<string, unknown>) {
  return request(`/api/v1/keys/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function listUsers(): Promise<UserItem[]> {
  const payload = await request<{ ok: boolean; data: UserItem[] }>("/api/v1/users");
  return payload.data;
}

export async function createUser(input: Record<string, unknown>) {
  return request("/api/v1/users", { method: "POST", body: JSON.stringify(input) });
}

export async function patchUser(id: string, patch: Record<string, unknown>) {
  return request(`/api/v1/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function listRoles(): Promise<RoleItem[]> {
  const payload = await request<{ ok: boolean; data: RoleItem[] }>("/api/v1/roles");
  return payload.data;
}

export async function createRole(input: Record<string, unknown>) {
  return request(`/api/v1/roles`, { method: "POST", body: JSON.stringify(input) });
}

export async function patchRole(id: string, patch: Record<string, unknown>) {
  return request(`/api/v1/roles/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function listPermissions(): Promise<PermissionItem[]> {
  const payload = await request<{ ok: boolean; data: PermissionItem[] }>("/api/v1/permissions");
  return payload.data;
}

export async function analyticsOps() {
  return request<{ ok: boolean; data: any }>("/api/v1/analytics/ops");
}

export async function analyticsTraffic() {
  return request<{ ok: boolean; data: any }>("/api/v1/analytics/traffic");
}

export async function fetchHealth(): Promise<HealthStatus> {
  const payload = await request<{ ok: boolean; data: HealthStatus }>("/health");
  return payload.data;
}

export async function listDeployments(): Promise<DeploymentItem[]> {
  const payload = await request<{ deployments: Record<string, any> }>("/api/v1/deploy");
  return Object.values(payload.deployments || {})
    .map((item) => normalizeDeploymentItem(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createDeployment(input: {
  github_url: string;
  name: string;
  branch?: string;
  env_vars?: Record<string, string>;
  route_prefix?: string;
  health_path?: string;
  auto_fix_port_conflicts?: boolean;
}): Promise<DeploymentItem> {
  const payload = await request<any>("/api/v1/deploy", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeDeploymentItem(payload);
}

export async function stopDeployment(id: string) {
  return request(`/api/v1/deploy/${id}/stop`, { method: "POST" });
}

export async function checkDeployPort(port: string): Promise<{ port: string; used: boolean; reason?: string }> {
  const payload = await request<{ ok: boolean; data: { port: string; used: boolean; reason?: string } }>(
    `/api/v1/deploy/port-check?port=${encodeURIComponent(port)}`,
  );
  return payload.data;
}

export async function fetchDeploymentLogs(id: string, lines = 200): Promise<string> {
  const payload = await request<{ logs: string }>(`/api/v1/deploy/${id}/logs?lines=${lines}`);
  return payload.logs || "";
}

export async function fetchDeployRuntimeStatus(): Promise<DeployRuntimeStatus> {
  const payload = await request<{ runtime: DeployRuntimeStatus }>("/api/v1/deploy/runtime");
  return payload.runtime;
}

export async function trackEvent(event: string, path: string, meta?: Record<string, unknown>) {
  return request("/api/v1/analytics/events", {
    method: "POST",
    body: JSON.stringify({ event, path, meta }),
  });
}
