import type { Organization } from "@/types"
import axios from "axios"
import { useState } from "react"
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";

export const RenderOrganizations =
    ({
        organizations,
        memberorganizations,
        deleteOrg
    }:
        {
            organizations: Organization[] | null,
            memberorganizations: Organization[] | null,
            deleteOrg: (id: string) => void
        }) => {

        const navigate = useNavigate();
        const [username, setUsername] = useState<string>("")
        const [invite, setInvite] = useState<boolean>(false)
        const [inviteOrgId, setInviteOrgId] = useState<string | null>(null);
        const [inviteResponseMessage, setInviteResponseMessage] = useState<string | null>(null)
        const [loadingInvite, setLoadingInvite] = useState<boolean>(false);

        function handleJoin(id: string) {
            if (!id) return;
            navigate(`/boards/${id}`)
        }

        async function handleInvite() {
            console.log("hello there")
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                if (!inviteOrgId || !username) return;
                //todo:fix this
                setLoadingInvite(true);
                const response = await axios.post(`${API_BASE_URL}/invite`, {
                    username: username,
                    organizationId: inviteOrgId
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log('res',response)
                setInviteResponseMessage(response.data.message)

                setTimeout(() => {
                    setInvite(false)
                    setLoadingInvite(false)
                    return;
                }, 3000);

            } catch (error) {

            }
        }

        async function deleteOrganization(id: string) {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                if (!id) return;

                const response = await axios.delete(`${API_BASE_URL}/organization/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log(response.data)
                if (response.status === 200) {
                    deleteOrg(id)
                }

            } catch (error) {
                console.log(error)
            }
        }

        return (
            <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">My organizations</h2>
                </div>
                {!organizations && !memberorganizations ? (
                    <div>
                        No organizations
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3 ">
                        {invite ? (
                            <form
                                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void handleInvite();
                                }}
                            >
                                <h3 className="text-lg font-medium">Invite a member</h3>
                                <p className="mt-1 text-sm text-slate-600">Enter their username to add them to this organization.</p>
                                {inviteResponseMessage && (
                                    <p className="mt-3 text-sm text-slate-700" role="status">{inviteResponseMessage}</p>
                                )}
                                <label className="mt-4 block text-sm font-medium" htmlFor="invite-username">Username</label>
                                <input
                                    id="invite-username"
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. alex"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                                <div className="mt-4 flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex w-32 items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                                        disabled={loadingInvite}
                                    >
                                        {loadingInvite ? (
                                            <span
                                                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                                                aria-label="Sending invite"
                                            />
                                        ) : (
                                            "Send invite"
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-white"
                                        onClick={() => setInvite(false)}
                                    >Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                {organizations?.map(org => (
                                    <div key={org.id} className="rounded-lg border border-slate-200 p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="">
                                                <h3 className="text-lg font-medium">{org.name}</h3>
                                                <p className="mt-2 text-sm text-slate-600">{org.description}</p>
                                            </div>

                                            <button
                                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
                                                onClick={() => deleteOrganization(org.id)}
                                            >Delete</button>

                                        </div>

                                        <div>
                                            <button
                                                onClick={() => handleJoin(org.id)}
                                                className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
                                            >
                                                Open board
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded border border-slate-300 px-3 py-2 text-sm font-medium"
                                                onClick={() => {
                                                    setInvite(true)
                                                    setInviteOrgId(org.id)
                                                }

                                                }
                                            >
                                                Invite
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {memberorganizations?.map(org => (
                                    <div key={org.id} className="rounded-lg border border-slate-200 p-4">
                                        <h3 className="text-lg font-medium">{org.name}</h3>
                                        <p className="mt-2 text-sm text-slate-600">{org.description}</p>
                                        <button
                                            onClick={() => handleJoin(org.id)}
                                            className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
                                        >
                                            Open board
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        )
    }