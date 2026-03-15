import { For, Match, Show, Switch, createEffect, createSignal } from "solid-js";
import LoginForm from "./features/auth/LoginForm";
import OwnerSetup from "./features/onboarding/OwnerSetup";
import ServicesPanel from "./features/services/ServicesPanel";
import KeysPanel from "./features/keys/KeysPanel";
import AnalyticsPanel from "./features/analytics/AnalyticsPanel";
import SettingsPanel from "./features/settings/SettingsPanel";
import AccessPanel from "./features/access/AccessPanel";
import { me, fetchBootstrapStatus, logout, resetPassword, trackEvent } from "./lib/api";
import type { AuthUser } from "./lib/types";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";

type Tab = "analytics" | "services" | "keys" | "access" | "settings";

export default function App() {
  const [loading, setLoading] = createSignal(true);
  const [bootstrapError, setBootstrapError] = createSignal<string | null>(null);
  const [bootstrapOpen, setBootstrapOpen] = createSignal(false);
  const [user, setUser] = createSignal<AuthUser | null>(null);
  const [tab, setTab] = createSignal<Tab>("analytics");
  const [passwordDraft, setPasswordDraft] = createSignal("");

  const nav: Array<{ id: Tab; label: string }> = [
    { id: "analytics", label: "Analytics" },
    { id: "services", label: "Services" },
    { id: "keys", label: "API Keys" },
    { id: "access", label: "Access" },
    { id: "settings", label: "Settings" },
  ];

  async function bootstrap() {
    console.log("Bootstrap: Starting...");
    setLoading(true);
    setBootstrapError(null);
    try {
      console.log("Bootstrap: Fetching status...");
      const status = await fetchBootstrapStatus();
      console.log("Bootstrap: Status received:", status);
      setBootstrapOpen(status.registrationOpen);
      console.log("Bootstrap: Set registrationOpen to", status.registrationOpen);
      if (!status.registrationOpen) {
        try {
          console.log("Bootstrap: Fetching current user...");
          const current = await me();
          console.log("Bootstrap: User received:", current);
          setUser(current);
        } catch {
          console.log("Bootstrap: No user found");
          setUser(null);
        }
      }
    } catch (err) {
      console.error("Bootstrap: Error occurred:", err);
      setBootstrapOpen(false);
      setUser(null);
      setBootstrapError(err instanceof Error ? err.message : "Failed to connect to API.");
    } finally {
      console.log("Bootstrap: Setting loading to false");
      setLoading(false);
      console.log("Bootstrap: Complete. Loading:", loading(), "BootstrapOpen:", bootstrapOpen(), "Error:", bootstrapError());
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

  return (
    <Show when={!loading()} fallback={<div class="p-10 text-center text-sm text-muted-foreground">Loading APwhy...</div>}>
      <Switch>
        <Match when={bootstrapError()}>
          <Card class="mx-auto mt-20 w-full max-w-xl space-y-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">APwhy</p>
              <h1 class="mt-1 text-2xl font-bold">Cannot reach API</h1>
              <p class="mt-2 text-sm text-muted-foreground">
                {bootstrapError()}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">
                On Railway, set <code>DATABASE_URL</code> to the Postgres service URL, not <code>apwhy-db</code>.
              </p>
            </div>
            <Button onClick={() => void bootstrap()}>Retry</Button>
          </Card>
        </Match>

        <Match when={bootstrapOpen()}>
          <OwnerSetup onComplete={bootstrap} />
        </Match>

        <Match when={!user()}>
          <LoginForm onLoggedIn={async () => bootstrap()} />
        </Match>

        <Match when={user()}>
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
                  <Match when={tab() === "keys"}><KeysPanel /></Match>
                  <Match when={tab() === "access"}><AccessPanel /></Match>
                  <Match when={tab() === "settings"}><SettingsPanel /></Match>
                </Switch>
              </main>
            </div>
          </div>
        </Match>
      </Switch>
    </Show>
  );
}
