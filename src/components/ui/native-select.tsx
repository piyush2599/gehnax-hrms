import * as React from "react";
import { cn } from "@/lib/utils";

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  error?: boolean;
}

/**
 * Plain HTML <select> styled to match the app's Input component.
 * Use this inside Dialog / Modal forms where @base-ui/react Select
 * doesn't work due to portal + modal pointer-event conflicts.
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_10px_center]",
          error && "border-red-300 focus-visible:ring-red-300",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
