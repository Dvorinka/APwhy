import { Match, Switch, createSignal } from "solid-js";
import { Card } from "../../components/ui/card";
import RolesPanel from "../roles/RolesPanel";
import UsersPanel from "../users/UsersPanel";

type AccessTab = "users" | "roles";

export default function AccessPanel() {
  const [tab, setTab] = createSignal<AccessTab>("users");

  return (
    <div class="space-y-4">
      <Card class="space-y-3">
        <div>
          <h3 class="text-lg font-semibold">Access Control</h3>
          <p class="text-sm text-muted-foreground">Manage invited users and the roles they can assume from one place.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class={`rounded-md border px-3 py-1.5 text-xs font-semibold ${tab() === "users" ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary/40 text-foreground"}`}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button
            class={`rounded-md border px-3 py-1.5 text-xs font-semibold ${tab() === "roles" ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary/40 text-foreground"}`}
            onClick={() => setTab("roles")}
          >
            Roles
          </button>
        </div>
      </Card>

      <Switch>
        <Match when={tab() === "users"}>
          <UsersPanel />
        </Match>
        <Match when={tab() === "roles"}>
          <RolesPanel />
        </Match>
      </Switch>
    </div>
  );
}
