import { For, Show, createResource, createSignal } from "solid-js";
import { createUser, listRoles, listUsers, patchUser } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Table, TableWrap, Td, Th } from "../../components/ui/table";

export default function UsersPanel() {
  const [users, { refetch }] = createResource(listUsers);
  const [roles] = createResource(listRoles);
  const [email, setEmail] = createSignal("");
  const [roleID, setRoleID] = createSignal("");
  const [createResult, setCreateResult] = createSignal<any>(null);

  async function create() {
    if (!email().trim()) return;
    const result = await createUser({ email: email().trim(), roleIds: roleID() ? [roleID()] : [] });
    setCreateResult(result);
    setEmail("");
    await refetch();
  }

  return (
    <div class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card class="space-y-3">
        <h3 class="text-lg font-semibold">Create User Invite</h3>
        <Input placeholder="teammate@example.com" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} />
        <Select value={roleID()} onChange={(e) => setRoleID(e.currentTarget.value)}>
          <option value="">Viewer (default)</option>
          <For each={roles() || []}>{(role) => <option value={role.id}>{role.name}</option>}</For>
        </Select>
        <Button onClick={() => void create()}>Create User</Button>
        <Show when={createResult()}>
          {(res) => (
            <div class="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs">
              <p class="font-semibold uppercase tracking-wide text-primary">Invite created</p>
              <p class="mt-2">Invite token: <code class="break-all">{res().data?.inviteToken}</code></p>
              <p class="mt-1">Temporary password: <code>{res().data?.temporaryPass}</code></p>
            </div>
          )}
        </Show>
      </Card>
      <Card>
        <h3 class="mb-3 text-lg font-semibold">Users</h3>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              <For each={users() || []}>
                {(item) => (
                  <tr class="border-t border-border">
                    <Td>
                      <p class="font-semibold">{item.email}</p>
                      <p class="text-xs text-muted-foreground">{item.id}</p>
                    </Td>
                    <Td>{item.roles.join(", ") || "-"}</Td>
                    <Td>
                      <Badge label={item.enabled ? "enabled" : "disabled"} tone={item.enabled ? "success" : "danger"} />
                    </Td>
                    <Td class="space-x-2">
                      <Button variant="secondary" onClick={() => void patchUser(item.id, { enabled: !item.enabled }).then(() => refetch())}>{item.enabled ? "Disable" : "Enable"}</Button>
                      <Button variant="outline" onClick={() => void patchUser(item.id, { resetPassword: true }).then(() => refetch())}>Reset Pass</Button>
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
