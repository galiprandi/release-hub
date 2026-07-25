import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  label?: ReactNode;
  caption?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, label, caption, action, className }: EmptyStateProps) {
  return (
    <div className={clsx("flex items-center justify-center w-full min-h-[400px]", className)}>
      <div className="w-full border rounded-md p-12 text-center text-muted-foreground bg-muted/30 border-dashed border-border">
        {icon && (
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-muted/30 border border-border">
              {icon}
            </div>
          </div>
        )}
        {label && (
          <h3 className="text-xs font-medium text-foreground mb-2">
            {label}
          </h3>
        )}
        {caption && <p className="text-sm max-w-xs mx-auto mb-6 opacity-70">{caption}</p>}
        {action}
      </div>
    </div>
  );
}
