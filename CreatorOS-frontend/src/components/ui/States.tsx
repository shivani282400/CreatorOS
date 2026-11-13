import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-white/60"
    >
      <Spinner className="h-7 w-7 text-indigo-300" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this. Please try again.",
  onRetry,
  compact = false
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`premium-card flex flex-col items-center justify-center gap-3 text-center ${compact ? "p-6" : "min-h-[40vh] p-10"}`}
    >
      <AlertTriangle className="h-7 w-7 text-amber-300" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-white">{title}</p>
        <p className="max-w-md text-sm text-white/50">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="premium-card flex flex-col items-center gap-3 p-10 text-center">
      <Inbox className="h-7 w-7 text-white/30" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-white">{title}</p>
        {description ? <p className="max-w-md text-sm text-white/50">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
