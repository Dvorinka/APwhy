import { For, createResource, createSignal } from "solid-js";
import { createService, listServices, patchService, validateService } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Table, TableWrap, Td, Th } from "../../components/ui/table";

export default function ServicesPanel() {
  const [services, { refetch }] = createResource(listServices);
  const [name, setName] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [routePrefix, setRoutePrefix] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function create() {
    if (!name().trim() || !url().trim() || !routePrefix().trim()) return;
    setBusy(true);
    try {
      await createService({ name: name().trim(), upstreamUrl: url().trim(), routePrefix: routePrefix().trim() });
      setName("");
      setUrl("");
      setRoutePrefix("");
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card class="space-y-3">
        <h3 class="text-lg font-semibold">Add Service</h3>
        <Input placeholder="Billing API" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        <Input placeholder="http://localhost:8080" value={url()} onInput={(e) => setUrl(e.currentTarget.value)} />
        <Input placeholder="/v1/billing" value={routePrefix()} onInput={(e) => setRoutePrefix(e.currentTarget.value)} />
        <Button onClick={() => void create()} disabled={busy()}>{busy() ? "Creating..." : "Create Service"}</Button>
      </Card>
      <Card>
        <h3 class="mb-3 text-lg font-semibold">Protected Services</h3>
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
                        label={item.lastValidationStatus || "unknown"}
                        tone={item.lastValidationStatus === "healthy" ? "success" : item.lastValidationStatus === "failed" ? "danger" : "default"}
                      />
                    </Td>
                    <Td class="space-x-2">
                      <Button variant="outline" onClick={() => void validateService(item.id).then(() => refetch())}>Validate</Button>
                      <Button variant="secondary" onClick={() => void patchService(item.id, { enabled: !item.enabled }).then(() => refetch())}>{item.enabled ? "Disable" : "Enable"}</Button>
                    </Td>
                  </tr>
                )}
              </For>
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
