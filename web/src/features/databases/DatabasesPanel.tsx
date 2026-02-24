import { For, createResource, createSignal } from "solid-js";
import { createDatabase, listDatabases, patchDatabase, validateDatabase } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Table, TableWrap, Td, Th } from "../../components/ui/table";

export default function DatabasesPanel() {
  const [databases, { refetch }] = createResource(listDatabases);
  const [name, setName] = createSignal("");
  const [provider, setProvider] = createSignal("sqlite");
  const [connectionUrl, setConnectionUrl] = createSignal("");

  async function create() {
    if (!name().trim() || !connectionUrl().trim()) return;
    await createDatabase({ name: name().trim(), provider: provider(), connectionUrl: connectionUrl().trim() });
    setName("");
    setConnectionUrl("");
    await refetch();
  }

  return (
    <div class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card class="space-y-3">
        <h3 class="text-lg font-semibold">Add Database Connector</h3>
        <Input placeholder="Primary Database" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        <Select value={provider()} onChange={(e) => setProvider(e.currentTarget.value)}>
          <option value="sqlite">SQLite</option>
          <option value="postgres">Postgres</option>
          <option value="mysql">MySQL</option>
        </Select>
        <Input
          placeholder={provider() === "sqlite" ? "./data/app.sqlite" : provider() === "postgres" ? "postgres://user:pass@host:5432/db" : "mysql://user:pass@host:3306/db"}
          value={connectionUrl()}
          onInput={(e) => setConnectionUrl(e.currentTarget.value)}
        />
        <Button onClick={() => void create()}>Create Connector</Button>
      </Card>
      <Card>
        <h3 class="mb-3 text-lg font-semibold">Database Connectors</h3>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Provider</Th>
                <Th>Target</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              <For each={databases() || []}>
                {(item) => (
                  <tr class="border-t border-border">
                    <Td>
                      <p class="font-semibold">{item.name}</p>
                      <p class="text-xs text-muted-foreground">{item.maskedConnectionUrl}</p>
                    </Td>
                    <Td>{item.provider}</Td>
                    <Td><code>{item.target}</code></Td>
                    <Td>
                      <Badge label={item.lastValidationStatus || "unknown"} tone={item.lastValidationStatus === "healthy" ? "success" : item.lastValidationStatus === "failed" ? "danger" : "default"} />
                    </Td>
                    <Td class="space-x-2">
                      <Button variant="outline" onClick={() => void validateDatabase(item.id).then(() => refetch())}>Validate</Button>
                      <Button variant="secondary" onClick={() => void patchDatabase(item.id, { enabled: !item.enabled }).then(() => refetch())}>{item.enabled ? "Disable" : "Enable"}</Button>
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
