import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { type User, type Organization } from "@/types";
import { API_BASE_URL } from "../config";
import { ProfileSection } from "../Components/ProfileSection";
import { RenderOrganizations } from "../Components/RnderOrganizations";
import { CreateOrganization } from "../Components/CreateOrganization";

export const Dashboard = () => {
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState<Organization[] | null>(null);
    const [memberorganizations, setMemberOrganizations] = useState<Organization[] | null>(null);
    const [user, setUser] = useState<User | null>(null)
    const [fetchingOrganizations, setFetchingOrganizations] = useState<boolean>(false);

    const addOrganizations = (task: Organization) => {
        setOrganizations(prevOrgs => prevOrgs ? [...prevOrgs, task] : [task]);
    }

    const deleteOrganizations = (id: string) =>{
        setOrganizations(prev => (prev ?? []).filter(i => i.id !== id));
    }

    useEffect(() => {
        (
            async () => {
                try {
                    setFetchingOrganizations(true);
                    const token = localStorage.getItem("token");
                    if (!token) {
                        console.log("No token found");
                        navigate("/auth/login")
                        return;
                    }
                    const userData = localStorage.getItem("user");
                    if (!userData) {
                        console.log("No user data found");
                        navigate("/auth/login");
                        return;
                    }
                    const user = JSON.parse(userData)
                    setUser(user)
                    const response = await axios.get(`${API_BASE_URL}/organization`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    })
                    console.log(response)
                    if (response.status !== 200) {
                        console.log("Error fetching organization data");
                        return;
                    }
                    setOrganizations(response.data.admin)
                    setMemberOrganizations(response.data.member)
                    setFetchingOrganizations(false);

                } catch (error: any) {
                    console.log("error", error.message)
                }
            }
        )()
    }, [])

    return (
        <div className="min-h-screen bg-white text-slate-800">

            <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 md:grid-cols-[260px_1fr]">
                <ProfileSection user={user} />

                <section className="space-y-6">
                    {fetchingOrganizations ? 
                        (
                            <div
                                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                                role="status"
                                aria-live="polite"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
                                        aria-hidden="true"
                                    />
                                    <h1 className="text-lg font-semibold text-slate-800">
                                        Loading
                                    </h1>
                                </div>
                                <p className="mt-2 text-sm text-slate-500">
                                    This should only take a moment.
                                </p>
                                <div className="mt-6 space-y-3" aria-hidden="true">
                                    <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                                    <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                                    <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                                </div>
                            </div>

                        ):(<div>

                            <RenderOrganizations 
                            organizations={organizations} 
                            memberorganizations={memberorganizations} 
                            deleteOrg={deleteOrganizations}
                            />
                    <CreateOrganization addOrganizations={addOrganizations} />
                            </div>
                        )
                    }
                        

                </section>
            </main>
        </div>
    )
}