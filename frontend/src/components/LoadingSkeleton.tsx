export default function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="glass p-6 space-y-4">
      <LoadingSkeleton className="h-4 w-32" />
      <LoadingSkeleton className="h-8 w-24" />
      <LoadingSkeleton className="h-3 w-full" />
      <LoadingSkeleton className="h-3 w-3/4" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass p-6 space-y-4">
      <LoadingSkeleton className="h-4 w-48" />
      <LoadingSkeleton className="h-64 w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <ChartSkeleton />
      <CardSkeleton />
    </div>
  );
}
