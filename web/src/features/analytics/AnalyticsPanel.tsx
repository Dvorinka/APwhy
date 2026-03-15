import { For, Show, createResource } from "solid-js";
import { analyticsOps, analyticsTraffic } from "../../lib/api";
import { Card } from "../../components/ui/card";

function Bars(props: { values: Array<{ label: string; value: number }>; emptyLabel?: string }) {
  if (!props.values.length) {
    return <p class="text-sm text-muted-foreground">{props.emptyLabel || "No data yet."}</p>;
  }

  const max = Math.max(1, ...props.values.map((entry) => entry.value));
  return (
    <div class="space-y-2">
      <For each={props.values}>
        {(entry) => (
          <div class="space-y-1">
            <div class="flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span class="truncate">{entry.label}</span>
              <span>{entry.value}</span>
            </div>
            <div class="h-2 rounded bg-secondary/70">
              <div class="h-2 rounded bg-primary" style={{ width: `${(entry.value / max) * 100}%` }} />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

function labelForMetric(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

export default function AnalyticsPanel() {
  const [ops, { refetch: refetchOps }] = createResource(() => analyticsOps());
  const [traffic, { refetch: refetchTraffic }] = createResource(() => analyticsTraffic());

  const refresh = async () => {
    await refetchOps();
    await refetchTraffic();
  };

  const umamiConfig = () => traffic()?.data?.umami?.config || {};
  const umamiSummary = () =>
    Object.entries(traffic()?.data?.umami || {})
      .filter(([key, value]) => typeof value === "number" && key !== "enabled")
      .map(([key, value]) => ({ label: labelForMetric(key), value: Number(value) }));

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-semibold">Ops + Traffic Analytics</h3>
        <button class="rounded border border-border bg-secondary px-3 py-1.5 text-sm" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Users</p>
          <p class="mt-2 text-2xl font-bold">{ops()?.data?.counts?.users ?? 0}</p>
        </Card>
        <Card>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Routes</p>
          <p class="mt-2 text-2xl font-bold">{ops()?.data?.counts?.services ?? 0}</p>
        </Card>
        <Card>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Deployments</p>
          <p class="mt-2 text-2xl font-bold">{ops()?.data?.counts?.deployments ?? 0}</p>
        </Card>
        <Card>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Monthly Requests</p>
          <p class="mt-2 text-2xl font-bold">{ops()?.data?.requests?.total ?? 0}</p>
        </Card>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <Card class="space-y-3">
          <h4 class="text-lg font-semibold">Hourly Request Trend (24h)</h4>
          <Bars
            values={(ops()?.data?.requests?.hourly || []).map((entry: any) => ({
              label: String(entry.bucket).slice(11, 16),
              value: Number(entry.value || 0),
            }))}
            emptyLabel="No routed API traffic recorded in the last 24 hours."
          />
        </Card>

        <Card class="space-y-3">
          <h4 class="text-lg font-semibold">Service Health</h4>
          <Bars
            values={Object.entries(ops()?.data?.serviceHealth || {}).map(([label, value]) => ({
              label,
              value: Number(value),
            }))}
            emptyLabel="No services have been validated yet."
          />
        </Card>

        <Card class="space-y-3">
          <h4 class="text-lg font-semibold">Incidents By Severity</h4>
          <Bars
            values={Object.entries(ops()?.data?.incidentsBySeverity || {}).map(([label, value]) => ({
              label,
              value: Number(value),
            }))}
            emptyLabel="No incidents recorded in the last 24 hours."
          />
        </Card>
      </div>

      <Card class="space-y-4">
        <div class="space-y-1">
          <h4 class="text-lg font-semibold">Traffic (Umami + Client Events)</h4>
          <p class="text-sm text-muted-foreground">{umamiConfig().message || "Traffic combines Umami API sync with APwhy local client events."}</p>
        </div>

        <div class="flex flex-wrap gap-2 text-xs">
          <span class={`rounded-full border px-2 py-1 ${umamiConfig().scriptConfigured ? "border-emerald-500/40 text-emerald-300" : "border-border text-muted-foreground"}`}>
            Script {umamiConfig().scriptConfigured ? "configured" : "missing"}
          </span>
          <span class={`rounded-full border px-2 py-1 ${umamiConfig().baseURLConfigured ? "border-emerald-500/40 text-emerald-300" : "border-border text-muted-foreground"}`}>
            Base URL {umamiConfig().baseURLConfigured ? "configured" : "missing"}
          </span>
          <span class={`rounded-full border px-2 py-1 ${umamiConfig().apiKeyConfigured ? "border-emerald-500/40 text-emerald-300" : "border-border text-muted-foreground"}`}>
            API token {umamiConfig().apiKeyConfigured ? "configured" : "missing"}
          </span>
          <span class={`rounded-full border px-2 py-1 ${umamiConfig().websiteConfigured ? "border-emerald-500/40 text-emerald-300" : "border-border text-muted-foreground"}`}>
            Website ID {umamiConfig().websiteConfigured ? "configured" : "missing"}
          </span>
        </div>

        <Show when={traffic()?.data?.umami?.enabled && umamiSummary().length} fallback={<p class="text-sm text-muted-foreground">Umami API charts stay local-only until the API token is configured.</p>}>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <For each={umamiSummary()}>
              {(entry) => (
                <div class="rounded-lg border border-border bg-secondary/25 p-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">{entry.label}</p>
                  <p class="mt-2 text-2xl font-bold">{entry.value}</p>
                </div>
              )}
            </For>
          </div>
        </Show>

        <div>
          <p class="mb-2 text-sm font-semibold">Top Client Event Paths</p>
          <Bars
            values={(traffic()?.data?.clientEvents || []).map((entry: any) => ({
              label: String(entry.path),
              value: Number(entry.count || 0),
            }))}
            emptyLabel="No dashboard client events recorded yet."
          />
        </div>
      </Card>
    </div>
  );
}
