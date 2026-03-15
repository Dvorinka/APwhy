import { createResource } from "solid-js";
import { analyticsTraffic, fetchDeployRuntimeStatus, fetchHealth } from "../../lib/api";
import { Card } from "../../components/ui/card";

function StatusRow(props: { label: string; value: string; ok?: boolean }) {
  return (
    <div class="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary/20 px-3 py-2 text-sm">
      <span class="text-muted-foreground">{props.label}</span>
      <span class={props.ok === undefined ? "" : props.ok ? "text-emerald-300" : "text-amber-300"}>{props.value}</span>
    </div>
  );
}

export default function SettingsPanel() {
  const [health, { refetch: refetchHealth }] = createResource(fetchHealth);
  const [runtime, { refetch: refetchRuntime }] = createResource(fetchDeployRuntimeStatus);
  const [traffic, { refetch: refetchTraffic }] = createResource(() => analyticsTraffic());

  const refresh = async () => {
    await refetchHealth();
    await refetchRuntime();
    await refetchTraffic();
  };

  const umamiConfig = () => traffic()?.data?.umami?.config || {};

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-semibold">Runtime + Integrations</h3>
        <button class="rounded border border-border bg-secondary px-3 py-1.5 text-sm" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <Card class="space-y-3">
          <div>
            <h4 class="text-lg font-semibold">Platform</h4>
            <p class="text-sm text-muted-foreground">Current control-plane runtime detected from the live API.</p>
          </div>
          <StatusRow label="Server" value={health()?.status || "unknown"} ok={health()?.status === "ok"} />
          <StatusRow label="Control DB" value={health()?.database || "unknown"} />
          <StatusRow label="Last health check" value={health()?.generatedAt || "-"} />
        </Card>

        <Card class="space-y-3">
          <div>
            <h4 class="text-lg font-semibold">Umami</h4>
            <p class="text-sm text-muted-foreground">{umamiConfig().message || "Configure Umami script + API sync to populate external traffic analytics."}</p>
          </div>
          <StatusRow label="Tracking script" value={umamiConfig().scriptConfigured ? "configured" : "missing"} ok={!!umamiConfig().scriptConfigured} />
          <StatusRow label="Base URL" value={umamiConfig().baseURLConfigured ? "configured" : "missing"} ok={!!umamiConfig().baseURLConfigured} />
          <StatusRow label="API token" value={umamiConfig().apiKeyConfigured ? "configured" : "missing"} ok={!!umamiConfig().apiKeyConfigured} />
          <StatusRow label="Website ID" value={umamiConfig().websiteConfigured ? "configured" : "missing"} ok={!!umamiConfig().websiteConfigured} />
        </Card>

        <Card class="space-y-3">
          <div>
            <h4 class="text-lg font-semibold">Deploy Runner</h4>
            <p class="text-sm text-muted-foreground">Git deployments need Docker socket access plus either Railpack or Go fallback support.</p>
          </div>
          <StatusRow label="Can deploy" value={runtime()?.canDeploy ? "ready" : "blocked"} ok={runtime()?.canDeploy} />
          <StatusRow label="Git" value={runtime()?.gitAvailable ? runtime()?.gitVersion || "available" : runtime()?.gitError || "missing"} ok={runtime()?.gitAvailable} />
          <StatusRow label="Docker CLI" value={runtime()?.dockerAvailable ? runtime()?.dockerVersion || "available" : runtime()?.dockerError || "missing"} ok={runtime()?.dockerAvailable} />
          <StatusRow label="Docker daemon" value={runtime()?.dockerReachable ? runtime()?.dockerReachableInfo || "reachable" : runtime()?.dockerError || runtime()?.dockerReachableInfo || "unreachable"} ok={runtime()?.dockerReachable} />
          <StatusRow label="Railpack" value={runtime()?.railpackAvailable ? runtime()?.railpackVersion || "available" : runtime()?.railpackError || "missing"} ok={runtime()?.railpackAvailable} />
          <StatusRow label="Go fallback" value={runtime()?.goAvailable ? runtime()?.goVersion || "available" : runtime()?.goError || "missing"} ok={runtime()?.goAvailable} />
          <StatusRow label="BuildKit host" value={runtime()?.buildKitHost || "not set"} ok={!!runtime()?.buildKitHost} />
          <StatusRow label="Deploy dir" value={runtime()?.baseDir || "-"} />
        </Card>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card class="space-y-2">
          <h4 class="text-lg font-semibold">Security</h4>
          <p class="text-sm text-muted-foreground">Owner bootstrap is one-time. After the first user exists, public registration is closed and login-only auth is enforced.</p>
          <p class="text-sm text-muted-foreground">Role permissions gate services, API keys, deploy actions, access control, and analytics APIs.</p>
        </Card>
        <Card class="space-y-2">
          <h4 class="text-lg font-semibold">Compose Notes</h4>
          <p class="text-sm text-muted-foreground">The Docker stack now needs Docker socket access and a BuildKit container if you want Git deploys to work from inside APwhy.</p>
          <p class="text-sm text-muted-foreground">File upload deployments are still not implemented. The working deployment flow in this build is GitHub repository deploys.</p>
        </Card>
      </div>
    </div>
  );
}
