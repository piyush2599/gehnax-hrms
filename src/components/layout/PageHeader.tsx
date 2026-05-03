"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      {(title || subtitle) && (
        <div className="min-w-0">
          {title && (
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      {!title && !subtitle && <div className="flex-1" />}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
