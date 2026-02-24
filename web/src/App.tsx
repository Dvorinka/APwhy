import { For, Match, Show, Switch, createEffect, createSignal } from "solid-js";
import LoginForm from "./features/auth/LoginForm";
import OwnerSetup from "./features/onboarding/OwnerSetup";
import ServicesPanel from "./features/services/ServicesPanel";
import DatabasesPanel from "./features/databases/DatabasesPanel";
import KeysPanel from "./features/keys/KeysPanel";
import AnalyticsPanel from "./features/analytics/AnalyticsPanel";
import UsersPanel from "./features/users/UsersPanel";
import RolesPanel from "./features/roles/RolesPanel";
import SettingsPanel from "./features/settings/SettingsPanel";
import { me, fetchBootstrapStatus, logout, resetPassword, trackEvent } from "./lib/api";
import type { AuthUser } from "./lib/types";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";

type Tab = "analytics" | "services" | "databases" | "keys" | "users" | "roles" | "settings";

export default function App() {
  const [loading, setLoading] = createSignal(true);
  const [bootstrapOpen, setBootstrapOpen] = createSignal(false);
  const [user, setUser] = createSignal<AuthUser | null>(null);
  const [tab, setTab] = createSignal<Tab>("analytics");
  const [passwordDraft, setPasswordDraft] = createSignal("");

  const nav: Array<{ id: Tab; label: string }> = [
    { id: "analytics", label: "Analytics" },
    { id: "services", label: "Services" },
    { id: "databases", label: "Databases" },
    { id: "keys", label: "API Keys" },
    { id: "users", label: "Users" },
    { id: "roles", label: "Roles" },
    { id: "settings", label: "Settings" },
  ];

  async function bootstrap() {
    setLoading(true);
    try {
      const status = await fetchBootstrapStatus();
      setBootstrapOpen(status.registrationOpen);
      if (!status.registrationOpen) {
        try {
          const current = await me();
          setUser(current);
        } catch {
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  createEffect(() => {
    void bootstrap();
  });

  createEffect(() => {
    if (user()) {
      void trackEvent("dashboard_tab", tab(), { tab: tab() }).catch(() => undefined);
    }
  });

  async function signOut() {
    await logout();
    setUser(null);
  }

  async function saveNewPassword() {
    if (!passwordDraft().trim()) return;
    await resetPassword(passwordDraft().trim());
    const current = await me();
    setUser(current);
    setPasswordDraft("");
  }

  if (loading()) {
    return <div class="p-10 text-center text-sm text-muted-foreground">Loading APwhy...</div>;
  }

  if (bootstrapOpen()) {
    return <OwnerSetup onComplete={bootstrap} />;
  }

  if (!user()) {
    return <LoginForm onLoggedIn={async () => bootstrap()} />;
  }

  return (
    <div class="min-h-screen bg-background">
      <div class="mx-auto max-w-[1500px] p-4 md:p-6 lg:p-8">
        <header class="rounded-xl border border-border bg-card p-4">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">APwhy</p>
              <h1 class="text-2xl font-bold">API Routing + Management Hub</h1>
              <p class="mt-1 text-sm text-muted-foreground">Green-focused, self-hosted control plane with auth bootstrap, RBAC, gateway, and analytics.</p>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-right text-xs text-muted-foreground">
                <p>{user()?.email}</p>
                <p>{user()?.roles.join(", ")}</p>
              </div>
              <Button variant="outline" onClick={() => void signOut()}>Sign Out</Button>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <For each={nav}>
              {(item) => (
                <button
                  class={`rounded-md border px-3 py-1.5 text-xs font-semibold ${tab() === item.id ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary/40 text-foreground"}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              )}
            </For>
          </div>
        </header>

        <Show when={user()?.forcePasswordReset}>
          <Card class="mt-4 space-y-3 border-amber-500/45 bg-amber-500/10">
            <h3 class="font-semibold text-amber-100">Password reset required</h3>
            <p class="text-sm text-amber-200/90">Your account must set a new password before using all dashboard actions.</p>
            <div class="flex max-w-md gap-2">
              <Input type="password" placeholder="New password" value={passwordDraft()} onInput={(e) => setPasswordDraft(e.currentTarget.value)} />
              <Button onClick={() => void saveNewPassword()}>Save</Button>
            </div>
          </Card>
        </Show>

        <main class="mt-4">
          <Switch>
            <Match when={tab() === "analytics"}><AnalyticsPanel /></Match>
            <Match when={tab() === "services"}><ServicesPanel /></Match>
            <Match when={tab() === "databases"}><DatabasesPanel /></Match>
            <Match when={tab() === "keys"}><KeysPanel /></Match>
            <Match when={tab() === "users"}><UsersPanel /></Match>
            <Match when={tab() === "roles"}><RolesPanel /></Match>
            <Match when={tab() === "settings"}><SettingsPanel /></Match>
          </Switch>
        </main>
      </div>
    </div>
  );
}
