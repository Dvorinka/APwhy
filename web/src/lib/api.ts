import type {
  ApiKeyItem,
  AuthUser,
  BootstrapStatus,
  DatabaseItem,
  PermissionItem,
  RoleItem,
  ServiceItem,
  UserItem,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = await response.json().catch(() => ({}));
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
  return request("/api/v1/bootstrap/register-owner", {
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

export async function trackEvent(event: string, path: string, meta?: Record<string, unknown>) {
  return request("/api/v1/analytics/events", {
    method: "POST",
    body: JSON.stringify({ event, path, meta }),
  });
}
