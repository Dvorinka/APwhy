import { For, Show, createResource, createSignal, onCleanup } from "solid-js";
import {
  checkDeployPort,
  createDeployment,
  createService,
  fetchDeploymentLogs,
  fetchDeployRuntimeStatus,
  listDeployments,
  listServices,
  patchService,
  stopDeployment,
  validateService,
} from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Table, TableWrap, Td, Th } from "../../components/ui/table";

function parseEnvVars(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce<Record<string, string>>((acc, line) => {
      const index = line.indexOf("=");
      if (index <= 0) return acc;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key) acc[key] = value;
      return acc;
    }, {});
}

function inspectRequestedPort(env: Record<string, string>) {
  if (!Object.prototype.hasOwnProperty.call(env, "PORT")) {
    return null;
  }

  const raw = `${env.PORT ?? ""}`.trim();
  if (!raw) {
    return {
      raw: "",
      normalized: "",
      error: "This repo sets PORT but leaves it empty.",
    };
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return {
      raw,
      normalized: raw,
      error: `PORT=${raw} is not a valid numeric port.`,
    };
  }

  return {
    raw,
    normalized: `${parsed}`,
    error: null,
  };
}

function routePrefixFor(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `/${slug || "service"}`;
}

function deploymentTone(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "running") return "success";
  if (status === "failed") return "danger";
  if (status === "building" || status === "cloning" || status === "queued") return "warning";
  return "default";
}

export default function ServicesPanel() {
  const [services, { refetch: refetchServices }] = createResource(listServices);
  const [deployments, { refetch: refetchDeployments }] = createResource(listDeployments);
  const [runtime, { refetch: refetchRuntime }] = createResource(fetchDeployRuntimeStatus);

  const [name, setName] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [routePrefix, setRoutePrefix] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  const [githubURL, setGithubURL] = createSignal("");
  const [deploymentName, setDeploymentName] = createSignal("");
  const [branch, setBranch] = createSignal("");
  const [envVars, setEnvVars] = createSignal("");
  const [deploymentRoutePrefix, setDeploymentRoutePrefix] = createSignal("");
  const [deploymentHealthPath, setDeploymentHealthPath] = createSignal("/health");
  const [autoFixPortConflicts, setAutoFixPortConflicts] = createSignal(true);
  const [deployBusy, setDeployBusy] = createSignal(false);
  const [deployError, setDeployError] = createSignal<string | null>(null);
  const [serviceMessage, setServiceMessage] = createSignal<string | null>(null);
  const [selectedDeploymentID, setSelectedDeploymentID] = createSignal("");

  const parsedDeploymentEnv = () => parseEnvVars(envVars());
  const requestedPortInfo = () => inspectRequestedPort(parsedDeploymentEnv());

  const [deploymentLogs, { refetch: refetchLogs }] = createResource(selectedDeploymentID, async (id) => {
    if (!id) return "";
    return fetchDeploymentLogs(id, 200);
  });
  const [requestedPortStatus] = createResource(
    () => {
      const info = requestedPortInfo();
      if (!info || info.error) return null;
      return info.normalized;
    },
    (port) => checkDeployPort(port),
  );

  const poll = window.setInterval(() => {
    void refetchDeployments();
  }, 5000);
  onCleanup(() => window.clearInterval(poll));

  async function createRoute() {
    if (!name().trim() || !url().trim() || !routePrefix().trim()) return;
    setBusy(true);
    setServiceMessage(null);
    try {
      await createService({ name: name().trim(), upstreamUrl: url().trim(), routePrefix: routePrefix().trim() });
      setName("");
      setUrl("");
      setRoutePrefix("");
      setServiceMessage("Route created.");
      await refetchServices();
    } finally {
      setBusy(false);
    }
  }

  async function deployFromGit() {
    if (!githubURL().trim() || !deploymentName().trim()) return;
    const portInfo = requestedPortInfo();
    if (portInfo?.error && !autoFixPortConflicts()) {
      setDeployError(`${portInfo.error} Re-enable auto-fix or correct the env vars before deploying.`);
      return;
    }

    setDeployBusy(true);
    setDeployError(null);
    try {
      const deployment = await createDeployment({
        github_url: githubURL().trim(),
        name: deploymentName().trim(),
        branch: branch().trim() || undefined,
        env_vars: parsedDeploymentEnv(),
        route_prefix: deploymentRoutePrefix().trim() || undefined,
        health_path: deploymentRoutePrefix().trim() ? deploymentHealthPath().trim() || "/health" : undefined,
        auto_fix_port_conflicts: autoFixPortConflicts(),
      });
      setSelectedDeploymentID(deployment.id);
      await refetchDeployments();
      await refetchLogs();
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : "Deployment failed.");
    } finally {
      setDeployBusy(false);
    }
  }

  async function stop(id: string) {
    await stopDeployment(id);
    await refetchDeployments();
    if (selectedDeploymentID() === id) {
      await refetchLogs();
    }
  }

  function useDeploymentAsRoute(item: { name: string; url?: string }) {
    if (!item.url) return;
    setName(item.name);
    setUrl(item.url);
    setRoutePrefix(routePrefixFor(item.name));
    setServiceMessage("Route form prefilled from deployment.");
  }

  return (
    <div class="space-y-4">
      <div class="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card class="space-y-3">
          <div>
            <h3 class="text-lg font-semibold">Deploy From GitHub</h3>
            <p class="text-sm text-muted-foreground">Deploy the repo, then optionally auto-expose it behind the main APwhy domain so only the APwhy port needs to be public.</p>
          </div>

          <div class="rounded-md border border-border bg-secondary/20 p-3 text-sm">
            <p class="font-semibold">Runtime status: {runtime()?.canDeploy ? "ready" : "blocked"}</p>
            <p class="mt-1 text-muted-foreground">
              {runtime()?.canDeploy
                ? "Git, Docker, and at least one builder are available."
                : "The container is missing deploy prerequisites. Check Settings for the exact missing piece."}
            </p>
            <Show when={runtime()?.dockerNetwork}>
              <p class="mt-2 text-xs text-muted-foreground">Internal deploy network: <code>{runtime()?.dockerNetwork}</code></p>
            </Show>
          </div>

          <Input placeholder="https://github.com/owner/repo.git" value={githubURL()} onInput={(e) => setGithubURL(e.currentTarget.value)} />
          <Input
            placeholder="Customer API"
            value={deploymentName()}
            onInput={(e) => {
              const value = e.currentTarget.value;
              setDeploymentName(value);
              if (!deploymentRoutePrefix().trim()) {
                setDeploymentRoutePrefix(routePrefixFor(value));
              }
            }}
          />
          <Input placeholder="main (optional)" value={branch()} onInput={(e) => setBranch(e.currentTarget.value)} />
          <Input
            placeholder="/api-service-1 (optional protected route)"
            value={deploymentRoutePrefix()}
            onInput={(e) => setDeploymentRoutePrefix(e.currentTarget.value)}
          />
          <Input
            placeholder="/health"
            value={deploymentHealthPath()}
            onInput={(e) => setDeploymentHealthPath(e.currentTarget.value)}
          />
          <textarea
            class="min-h-32 w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder={"PORT=8080\nDATABASE_URL=postgresql://..."}
            value={envVars()}
            onInput={(e) => setEnvVars(e.currentTarget.value)}
          />
          <Show when={requestedPortInfo()}>
            {(info) => (
              <div class="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p class="font-semibold">Repo-defined PORT detected</p>
                <p class="mt-1 text-amber-100/80">
                  {info().error
                    ? `${info().error} APwhy can replace it with a managed runtime port if auto-fix stays enabled.`
                    : `This repo defines PORT=${info().normalized}. APwhy will try to use it first and can reassign it automatically if that port is already in use.`}
                </p>
                <Show when={!info().error}>
                  <p class="mt-2 text-xs text-amber-100/80">
                    {requestedPortStatus.loading
                      ? `Checking whether PORT=${info().normalized} is currently available...`
                      : requestedPortStatus()?.used
                        ? `PORT=${info().normalized} is currently busy${requestedPortStatus()?.reason ? `: ${requestedPortStatus()?.reason}.` : "."}`
                        : `PORT=${info().normalized} is currently free.`}
                  </p>
                </Show>
                <label class="mt-3 flex items-center gap-2 text-xs text-amber-100/90">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border border-border bg-background"
                    checked={autoFixPortConflicts()}
                    onChange={(e) => setAutoFixPortConflicts(e.currentTarget.checked)}
                  />
                  Auto-fix PORT conflicts by overriding `PORT` when needed
                </label>
                <Show when={!autoFixPortConflicts()}>
                  <p class="mt-2 text-xs text-amber-100/80">If the requested port is busy, the deployment will fail instead of being reassigned.</p>
                </Show>
              </div>
            )}
          </Show>
          <Button onClick={() => void deployFromGit()} disabled={deployBusy()}>
            {deployBusy() ? "Deploying..." : "Deploy Repository"}
          </Button>
          <Show when={deployError()}>
            <p class="text-sm text-red-300">{deployError()}</p>
          </Show>
        </Card>

        <Card class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold">Deployments</h3>
              <p class="text-sm text-muted-foreground">Railpack is attempted first. Go repositories fall back to `go build` if Railpack is unavailable.</p>
            </div>
            <Button variant="outline" onClick={() => void Promise.all([refetchDeployments(), refetchRuntime()])}>Refresh</Button>
          </div>

          <Show when={(deployments() || []).length} fallback={<p class="text-sm text-muted-foreground">No deployments yet.</p>}>
            <div class="space-y-3">
              <For each={deployments() || []}>
                {(item) => (
                  <div class="rounded-lg border border-border bg-secondary/15 p-4">
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div class="space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="font-semibold">{item.name}</p>
                          <Badge label={item.status} tone={deploymentTone(item.status)} />
                          <Show when={item.buildSystem}>
                            <span class="text-xs text-muted-foreground">via {item.buildSystem}</span>
                          </Show>
                        </div>
                        <Show when={item.detectedProviders?.length}>
                          <p class="text-xs text-muted-foreground">Providers: {item.detectedProviders?.join(", ")}</p>
                        </Show>
                        <Show when={item.url}>
                          <p class="text-xs text-muted-foreground">Upstream: {item.url}</p>
                        </Show>
                        <Show when={item.publicUrl || item.routePrefix}>
                          <p class="text-xs text-muted-foreground">Public route: {item.publicUrl || item.routePrefix}</p>
                        </Show>
                        <Show when={item.error}>
                          <p class="text-xs text-red-300">{item.error}</p>
                        </Show>
                        <p class="text-xs text-muted-foreground">Updated {item.updatedAt}</p>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => { setSelectedDeploymentID(item.id); void refetchLogs(); }}>
                          Logs
                        </Button>
                        <Button variant="secondary" onClick={() => useDeploymentAsRoute(item)} disabled={!item.url}>
                          Use As Route
                        </Button>
                        <Button variant="outline" onClick={() => void stop(item.id)} disabled={item.status !== "running" && item.status !== "building" && item.status !== "cloning" && item.status !== "queued"}>
                          Stop
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Card>
      </div>

      <Show when={selectedDeploymentID()}>
        <Card class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold">Deployment Logs</h3>
              <p class="text-sm text-muted-foreground">Showing the latest 200 log lines for {selectedDeploymentID()}.</p>
            </div>
            <Button variant="outline" onClick={() => void refetchLogs()}>Refresh Logs</Button>
          </div>
          <pre class="max-h-[420px] overflow-auto rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
            {deploymentLogs() || "No logs available yet."}
          </pre>
        </Card>
      </Show>

      <div class="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card class="space-y-3">
          <div>
            <h3 class="text-lg font-semibold">Expose A Route</h3>
            <p class="text-sm text-muted-foreground">Create the protected proxy route that APwhy will front with keys, quotas, and validation.</p>
          </div>
          <Input placeholder="Billing API" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          <Input placeholder="http://localhost:8080" value={url()} onInput={(e) => setUrl(e.currentTarget.value)} />
          <Input placeholder="/v1/billing" value={routePrefix()} onInput={(e) => setRoutePrefix(e.currentTarget.value)} />
          <Button onClick={() => void createRoute()} disabled={busy()}>{busy() ? "Creating..." : "Create Route"}</Button>
          <Show when={serviceMessage()}>
            <p class="text-sm text-muted-foreground">{serviceMessage()}</p>
          </Show>
        </Card>

        <Card>
          <h3 class="mb-3 text-lg font-semibold">Protected Routes</h3>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Route</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                <For each={services() || []}>
                  {(item) => (
                    <tr class="border-t border-border">
                      <Td>
                        <p class="font-semibold">{item.name}</p>
                        <p class="text-xs text-muted-foreground">{item.upstreamUrl}</p>
                      </Td>
                      <Td><code>{item.routePrefix}</code></Td>
                      <Td>
                        <Badge
                          label={item.lastValidationStatus || (item.enabled ? "pending" : "disabled")}
                          tone={item.lastValidationStatus === "healthy" ? "success" : item.lastValidationStatus === "failed" ? "danger" : "default"}
                        />
                      </Td>
                      <Td class="space-x-2">
                        <Button variant="outline" onClick={() => void validateService(item.id).then(() => refetchServices())}>Validate</Button>
                        <Button variant="secondary" onClick={() => void patchService(item.id, { enabled: !item.enabled }).then(() => refetchServices())}>{item.enabled ? "Disable" : "Enable"}</Button>
                      </Td>
                    </tr>
                  )}
                </For>
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </div>
    </div>
  );
}
