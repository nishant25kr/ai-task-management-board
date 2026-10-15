import { type User } from "@/types";

export const ProfileSection = ({ user }: { user: User | null }) => {
    if(!user){
        return (
            <div>loading </div>
        )
    }else{

        return (
            <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="mb-4 text-lg font-semibold">Profile</h2>
            <div className="space-y-2 text-sm text-slate-600">
                <p>User ID: {user?.id}</p>
                <p>Username: {user?.username}</p>
            </div>

            <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick actions</h3>
                <ul className="space-y-2 text-sm">
                    <li>Overview</li>
                    <li>Boards</li>
                    <li>Members</li>
                    <li>Settings</li>
                </ul>   
            </div>
        </div>
    )
}
}