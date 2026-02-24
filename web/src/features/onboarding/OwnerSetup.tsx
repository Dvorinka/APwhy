import { createSignal } from "solid-js";
import { registerOwner } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

interface Props {
  onComplete: () => Promise<void>;
}

export default function OwnerSetup(props: Props) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function submit(event: Event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await registerOwner(email().trim(), password());
      await props.onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create owner");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card class="mx-auto mt-20 w-full max-w-md space-y-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">APwhy Bootstrap</p>
        <h1 class="mt-1 text-2xl font-bold">Create your owner account</h1>
        <p class="mt-2 text-sm text-muted-foreground">This is only available while no users exist in the database.</p>
      </div>
      <form class="space-y-3" onSubmit={(event) => void submit(event)}>
        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner Email</label>
          <Input value={email()} onInput={(event) => setEmail(event.currentTarget.value)} placeholder="owner@example.com" />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</label>
          <Input type="password" value={password()} onInput={(event) => setPassword(event.currentTarget.value)} placeholder="At least 8 characters" />
        </div>
        {error() && <div class="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error()}</div>}
        <Button type="submit" class="w-full" disabled={busy()}>{busy() ? "Creating..." : "Create Owner"}</Button>
      </form>
    </Card>
  );
}
