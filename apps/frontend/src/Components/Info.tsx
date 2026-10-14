import type { Organization } from "@/types"

export const Info = ({ organizations }: { organizations: Organization }) => {
    // if (!organizations) {
    //     return (
    //         <div>loading</div>
    //     )
    // } else {
    //     return (
    //         <div className="grid gap-4 md:grid-cols-3">
    //             <div className="rounded-xl border border-slate-200 p-4">
    //                 <p className="text-sm text-slate-500">Total boards</p>
    //                 <p className="mt-2 text-3xl font-semibold">{organizations?.length ?? 0}</p>
    //             </div>
    //             <div className="rounded-xl border border-slate-200 p-4">
    //                 <p className="text-sm text-slate-500">Active projects</p>
    //                 <p className="mt-2 text-3xl font-semibold">{organizations?.length ?? 0}</p>
    //             </div>
    //             <div className="rounded-xl border border-slate-200 p-4">
    //                 <p className="text-sm text-slate-500">Members</p>
    //                 <p className="mt-2 text-3xl font-semibold">1</p>
    //             </div>
    //         </div>
    //     )
    // }
}