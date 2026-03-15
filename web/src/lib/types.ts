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

export interface DeploymentItem {
  id: string;
  name: string;
  status: string;
  buildSystem?: string;
  detectedProviders?: string[];
  logs?: string;
  url?: string;
  routePrefix?: string;
  publicUrl?: string;
  serviceId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeployRuntimeStatus {
  baseDir: string;
  buildKitHost: string;
  gitAvailable: boolean;
  gitVersion?: string;
  gitError?: string;
  dockerAvailable: boolean;
  dockerVersion?: string;
  dockerError?: string;
  dockerReachable: boolean;
  dockerReachableInfo?: string;
  railpackAvailable: boolean;
  railpackVersion?: string;
  railpackError?: string;
  goAvailable: boolean;
  goVersion?: string;
  goError?: string;
  dockerNetwork?: string;
  canDeploy: boolean;
}

export interface HealthStatus {
  status: string;
  name: string;
  database: string;
  generatedAt: string;
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
