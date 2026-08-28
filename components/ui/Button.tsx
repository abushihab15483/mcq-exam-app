import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "bg-gold text-paper hover:bg-gold/90",
  outline: "bg-transparent text-ink border border-border hover:bg-black/[0.03]",
  danger: "bg-danger text-paper hover:bg-danger/90",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-2 min-h-[40px]",
  md: "text-sm px-4 py-2.5 min-h-[44px]",
  lg: "text-base px-6 py-3 min-h-[48px]",
};

// সব জায়গায় বাটনের রং/সাইজ এক রাখতে এই একটা কম্পোনেন্ট ব্যবহার হবে
// (student side, admin side — দুই জায়গাতেই import হবে components/ui/Button থেকে)
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-card font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
