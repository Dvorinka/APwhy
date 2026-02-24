import { JSX } from "solid-js";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "danger";
}

export function Button(props: ButtonProps) {
  const variant = () => props.variant || "default";
  const classes = () => {
    if (variant() === "outline") {
      return "border border-border bg-transparent text-foreground hover:bg-secondary";
    }
    if (variant() === "secondary") {
      return "border border-border bg-secondary text-secondary-foreground hover:opacity-95";
    }
    if (variant() === "danger") {
      return "border border-destructive bg-destructive text-destructive-foreground hover:opacity-95";
    }
    return "border border-primary bg-primary text-primary-foreground hover:opacity-95";
  };

  return (
    <button
      {...props}
      class={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition ${classes()} ${props.class || ""}`}
    >
      {props.children}
    </button>
  );
}
