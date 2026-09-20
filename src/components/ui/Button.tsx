import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonProps = {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "lime-outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

const variants = {
  primary:
    "bg-qc-lime text-qc-black hover:brightness-110 shadow-[0_0_0_1px_rgba(200,245,66,0.3)]",
  secondary:
    "bg-white/5 text-qc-white border border-white/15 hover:bg-white/10 hover:border-white/25",
  ghost: "bg-transparent text-qc-white hover:bg-white/5",
  "lime-outline":
    "bg-transparent text-qc-lime border border-qc-lime/40 hover:bg-qc-lime/10",
};

const sizes = {
  sm: "h-9 px-4 text-xs tracking-[0.12em]",
  md: "h-11 px-6 text-xs tracking-[0.14em]",
  lg: "h-13 px-8 text-sm tracking-[0.16em] min-h-[52px]",
};

export function Button({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
  type = "button",
  disabled,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 font-medium uppercase transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
