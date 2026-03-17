import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("shimmer rounded-lg bg-slate-200 dark:bg-zinc-800/50", className)}
      aria-hidden="true"
    />
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 dark:border-zinc-800/50">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-12" />
      <Skeleton className="h-6 w-12" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
