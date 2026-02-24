import { JSX } from "solid-js";

export function Input(props: JSX.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      class={`w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary ${props.class || ""}`}
    />
  );
}
