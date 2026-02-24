import { For, Show, createResource } from "solid-js";
import { analyticsOps, analyticsTraffic } from "../../lib/api";
import { Card } from "../../components/ui/card";

function Bars(props: { values: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...props.values.map((entry) => entry.value));
  return (
    <div class="space-y-2">
      <For each={props.values}>
        {(entry) => (
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{entry.label}</span>
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

export default function AnalyticsPanel() {
  const [ops, { refetch: refetchOps }] = createResource(() => analyticsOps());
  const [traffic, { refetch: refetchTraffic }] = createResource(() => analyticsTraffic());

  const refresh = async () => {
    await refetchOps();
    await refetchTraffic();
  };

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
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Services</p>
          <p class="mt-2 text-2xl font-bold">{ops()?.data?.counts?.services ?? 0}</p>
        </Card>
        <Card>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">DB Connectors</p>
          <p class="mt-2 text-2xl font-bold">{ops()?.data?.counts?.databases ?? 0}</p>
        </Card>
        <Card>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Monthly Requests</p>
          <p class="mt-2 text-2xl font-bold">{ops()?.data?.requests?.total ?? 0}</p>
        </Card>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <Card class="space-y-3">
          <h4 class="text-lg font-semibold">Hourly Request Trend (24h)</h4>
          <Bars
            values={(ops()?.data?.requests?.hourly || []).map((entry: any) => ({
              label: String(entry.bucket).slice(11, 16),
              value: Number(entry.value || 0),
            }))}
          />
        </Card>

        <Card class="space-y-3">
          <h4 class="text-lg font-semibold">Incidents By Severity</h4>
          <Bars
            values={Object.entries(ops()?.data?.incidentsBySeverity || {}).map(([label, value]) => ({
              label,
              value: Number(value),
            }))}
          />
        </Card>
      </div>

      <Card class="space-y-3">
        <h4 class="text-lg font-semibold">Traffic (Umami + Client Events)</h4>
        <Show when={traffic()?.data?.umami?.enabled} fallback={<p class="text-sm text-muted-foreground">Umami API not configured or unavailable. Showing local client events.</p>}>
          <pre class="rounded border border-border bg-secondary/35 p-3 text-xs text-muted-foreground">{JSON.stringify(traffic()?.data?.umami || {}, null, 2)}</pre>
        </Show>
        <div>
          <p class="mb-2 text-sm font-semibold">Top Client Event Paths</p>
          <Bars values={(traffic()?.data?.clientEvents || []).map((entry: any) => ({ label: String(entry.path), value: Number(entry.count || 0) }))} />
        </div>
      </Card>
    </div>
  );
}
