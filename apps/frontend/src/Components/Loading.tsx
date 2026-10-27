export const Loading =() => {
return(
    <div
                role="status"
                aria-live="polite"
                className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Loading your board</p>
                    <p className="mt-0.5 text-xs text-slate-500">Getting everything ready...</p>
                  </div>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map(column => (
                    <div key={column} className="space-y-3 rounded-xl bg-slate-50 p-4">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                      <div className="h-20 animate-pulse rounded-lg border border-slate-100 bg-white" />
                      <div className="h-16 animate-pulse rounded-lg border border-slate-100 bg-white" />
                    </div>
                  ))}
                </div>
              </div>
)
}