export interface BootstrapStatus {
  hasUsers: boolean;
  registrationOpen: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  forcePasswordReset: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  upstreamUrl: string;
  routePrefix: string;
  healthPath: string;
  enabled: boolean;
  rpmLimit: number | null;
  monthlyQuota: number | null;
  requestTimeoutMs: number | null;
  lastValidationStatus: string | null;
  lastValidationAt: string | null;
}

export interface DatabaseItem {
  id: string;
  name: string;
  slug: string;
  provider: string;
  target: string;
  maskedConnectionUrl: string;
  enabled: boolean;
  lastValidationStatus: string | null;
  lastValidationAt: string | null;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  plan: string;
  enabled: boolean;
  rpmLimit: number | null;
  monthlyQuota: number | null;
  allowedServiceIds: string[];
  lastUsedAt: string | null;
}

export interface UserItem {
  id: string;
  email: string;
  enabled: boolean;
  forcePasswordReset: boolean;
  roles: string[];
}

export interface RoleItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  isSystem: boolean;
  permissionCodes: string[];
}

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  description: string;
}
