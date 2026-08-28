import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

// প্রশ্নের card, রেজাল্ট card, admin dashboard এর stat card — সবই এর উপর বসবে
export default function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-white shadow-sm p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
