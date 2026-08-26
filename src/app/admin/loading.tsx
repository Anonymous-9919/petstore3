export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading admin data">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-black/10" />
        <div className="h-9 w-52 animate-pulse rounded bg-black/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-black/10 bg-white" />)}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-black/10 bg-white" />
    </div>
  );
}
