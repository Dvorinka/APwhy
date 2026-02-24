import { For, Show, createResource, createSignal } from "solid-js";
import { createKey, listKeys, patchKey } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Table, TableWrap, Td, Th } from "../../components/ui/table";

export default function KeysPanel() {
  const [keys, { refetch }] = createResource(listKeys);
  const [name, setName] = createSignal("");
  const [plan, setPlan] = createSignal("pro");
  const [createdKey, setCreatedKey] = createSignal<string | null>(null);

  async function create() {
    if (!name().trim()) return;
    const payload = await createKey({ name: name().trim(), plan: plan() });
    setCreatedKey(payload.data.key);
    setName("");
    await refetch();
  }

  return (
    <div class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card class="space-y-3">
        <h3 class="text-lg font-semibold">Create API Key</h3>
        <Input placeholder="production-client" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        <Select value={plan()} onChange={(e) => setPlan(e.currentTarget.value)}>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </Select>
        <Button onClick={() => void create()}>Create Key</Button>
        <Show when={createdKey()}>
          {(value) => (
            <div class="rounded-md border border-primary/50 bg-primary/15 p-3 text-xs">
              <p class="font-semibold uppercase tracking-wide text-primary">Generated once</p>
              <p class="mt-2 break-all rounded bg-card px-2 py-1 font-mono text-foreground">{value()}</p>
            </div>
          )}
        </Show>
      </Card>
      <Card>
        <h3 class="mb-3 text-lg font-semibold">API Keys</h3>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Plan</Th>
                <Th>Prefix</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              <For each={keys() || []}>
                {(item) => (
                  <tr class="border-t border-border">
                    <Td>
                      <p class="font-semibold">{item.name}</p>
                      <p class="text-xs text-muted-foreground">Last used: {item.lastUsedAt || "never"}</p>
                    </Td>
                    <Td>{item.plan}</Td>
                    <Td><code>{item.keyPrefix}</code></Td>
                    <Td><Badge label={item.enabled ? "enabled" : "disabled"} tone={item.enabled ? "success" : "danger"} /></Td>
                    <Td>
                      <Button variant="secondary" onClick={() => void patchKey(item.id, { enabled: !item.enabled }).then(() => refetch())}>{item.enabled ? "Disable" : "Enable"}</Button>
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
