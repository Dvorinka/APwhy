import { createSignal } from "solid-js";
import { login } from "../../lib/api";
import type { AuthUser } from "../../lib/types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

interface Props {
  onLoggedIn: (user: AuthUser) => Promise<void>;
}

export default function LoginForm(props: Props) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function submit(event: Event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email().trim(), password());
      await props.onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card class="mx-auto mt-20 w-full max-w-md space-y-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">APwhy</p>
        <h1 class="mt-1 text-2xl font-bold">Sign in</h1>
        <p class="mt-2 text-sm text-muted-foreground">Registration is disabled once the owner account exists.</p>
      </div>
      <form class="space-y-3" onSubmit={(event) => void submit(event)}>
        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
          <Input value={email()} onInput={(event) => setEmail(event.currentTarget.value)} placeholder="owner@example.com" />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</label>
          <Input type="password" value={password()} onInput={(event) => setPassword(event.currentTarget.value)} placeholder="Your password" />
        </div>
        {error() && <div class="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error()}</div>}
        <Button type="submit" class="w-full" disabled={busy()}>{busy() ? "Signing in..." : "Sign In"}</Button>
      </form>
    </Card>
  );
}
