export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="w-full h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] rounded-full animate-loading-bar" />
        </div>
        <p className="text-sm text-[#9CA3AF]">Loading…</p>
      </div>
    </div>
  );
}
