import { Card } from "../../components/ui/card";

export default function SettingsPanel() {
  return (
    <div class="grid gap-4 lg:grid-cols-2">
      <Card class="space-y-2">
        <h3 class="text-lg font-semibold">Runtime</h3>
        <p class="text-sm text-muted-foreground">APwhy uses a Go backend with SQLite control-plane storage and modular SolidJS frontend.</p>
        <p class="text-sm text-muted-foreground">Use Docker + Traefik + Umami stack from `deploy/docker-compose.yml` for production self-hosting.</p>
      </Card>
      <Card class="space-y-2">
        <h3 class="text-lg font-semibold">Security</h3>
        <p class="text-sm text-muted-foreground">Owner bootstrap is one-time. After first user exists, registration is closed and login-only flow is enforced.</p>
        <p class="text-sm text-muted-foreground">Role permissions control access to services, keys, users, roles, and analytics APIs.</p>
      </Card>
    </div>
  );
}
