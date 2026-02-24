import { JSX } from "solid-js";

export function TableWrap(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return <div class={`overflow-auto rounded-md border border-border ${props.class || ""}`}>{props.children}</div>;
}

export function Table(props: JSX.HTMLAttributes<HTMLTableElement>) {
  return <table class={`min-w-full divide-y divide-border text-sm ${props.class || ""}`}>{props.children}</table>;
}

export function Th(props: JSX.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th class={`bg-secondary/60 px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground ${props.class || ""}`}>{props.children}</th>;
}

export function Td(props: JSX.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td class={`px-3 py-2 align-top ${props.class || ""}`}>{props.children}</td>;
}
