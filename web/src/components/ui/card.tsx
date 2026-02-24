import { JSX } from "solid-js";

export function Card(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      class={`rounded-xl border border-border bg-card/90 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.24)] ${props.class || ""}`}
    >
      {props.children}
    </div>
  );
}
