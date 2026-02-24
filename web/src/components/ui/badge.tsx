interface BadgeProps {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}

export function Badge(props: BadgeProps) {
  const tone = () => props.tone || "default";
  const cls = () => {
    if (tone() === "success") return "border-emerald-500/50 bg-emerald-500/15 text-emerald-200";
    if (tone() === "warning") return "border-amber-500/50 bg-amber-500/15 text-amber-200";
    if (tone() === "danger") return "border-rose-500/50 bg-rose-500/15 text-rose-200";
    return "border-border bg-secondary/70 text-foreground";
  };
  return <span class={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${cls()}`}>{props.label}</span>;
}
