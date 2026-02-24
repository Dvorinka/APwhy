import { For, createResource, createSignal } from "solid-js";
import { createRole, listPermissions, listRoles, patchRole } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Table, TableWrap, Td, Th } from "../../components/ui/table";

export default function RolesPanel() {
  const [roles, { refetch }] = createResource(listRoles);
  const [permissions] = createResource(listPermissions);
  const [name, setName] = createSignal("");
  const [selectedCodes, setSelectedCodes] = createSignal<string[]>([]);

  function toggle(code: string) {
    setSelectedCodes((current) => (current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code]));
  }

  async function create() {
    if (!name().trim()) return;
    await createRole({ name: name().trim(), permissionCodes: selectedCodes() });
    setName("");
    setSelectedCodes([]);
    await refetch();
  }

  return (
    <div class="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card class="space-y-3">
        <h3 class="text-lg font-semibold">Create Role</h3>
        <Input placeholder="Ops Manager" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        <div class="grid max-h-56 gap-2 overflow-auto rounded border border-border p-2 text-xs">
          <For each={permissions() || []}>
            {(permission) => (
              <label class="inline-flex items-center gap-2 rounded bg-secondary/40 px-2 py-1">
                <input type="checkbox" checked={selectedCodes().includes(permission.code)} onChange={() => toggle(permission.code)} />
                <span>{permission.code}</span>
              </label>
            )}
          </For>
        </div>
        <Button onClick={() => void create()}>Create Role</Button>
      </Card>
      <Card>
        <h3 class="mb-3 text-lg font-semibold">Roles</h3>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Permissions</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              <For each={roles() || []}>
                {(role) => (
                  <tr class="border-t border-border">
                    <Td>
                      <p class="font-semibold">{role.name}</p>
                      <p class="text-xs text-muted-foreground">{role.description}</p>
                    </Td>
                    <Td>
                      <code>{role.slug}</code>
                      {role.isSystem && <span class="ml-2 text-xs text-muted-foreground">system</span>}
                    </Td>
                    <Td class="max-w-[320px] text-xs text-muted-foreground">{role.permissionCodes.join(", ") || "-"}</Td>
                    <Td>
                      <Badge label={role.enabled ? "enabled" : "disabled"} tone={role.enabled ? "success" : "danger"} />
                    </Td>
                    <Td>
                      <Button variant="secondary" onClick={() => void patchRole(role.id, { enabled: !role.enabled }).then(() => refetch())}>{role.enabled ? "Disable" : "Enable"}</Button>
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
