import { JSX } from "solid-js";

export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      class={`w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary ${props.class || ""}`}
    >
      {props.children}
    </select>
  );
}
