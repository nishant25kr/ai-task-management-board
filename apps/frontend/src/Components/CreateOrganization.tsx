import { API_BASE_URL } from "@/config";
import type { Organization } from "@/types";
import axios from "axios";
import { useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";


export const CreateOrganization = ({addOrganizations}:{addOrganizations :(task: Organization) => void}) => {
    const navigate = useNavigate()
    const [name, setName] = useState<string>("")
    const [description, setDescription] = useState<string>("")
    const [error,setError] = useState<string | null>(null)
    
    const createOrganization = async () => {
            try {
                if(!name || !description) {
                    setError("Fill the input")
                    return
                }
                const token = localStorage.getItem("token");
                if (!token) {
                    console.log("No token found");
                    navigate("/auth/login")
                    return;
                }
                const userData = localStorage.getItem("user");
                if (!userData) {
                    console.log("No user data found");
                    navigate("/auth/login")
                    return;
                }
                const user = JSON.parse(userData);
                const response = await axios.post(`${API_BASE_URL}/organization`, {
                    name: name,
                    description: description
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (response.status !== 200) {
                    console.log("Error creating organization");
                    return;
                }
                const data = response.data;
                addOrganizations(data.data)
            } catch (error: any) {
                console.log(error);
                setError(error.message)
            }
        }

    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="mb-4 text-xl font-semibold">Create organization</h2>
            <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                    Title
                    <input
                        type="text"
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Title"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none"
                    />
                </label>

                <label className="text-sm font-medium text-slate-700">
                    Description
                    <input
                        type="text"
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none"
                    />
                </label>
            </div>

            <button
                onClick={createOrganization}
                className="mt-4 rounded-md border border-slate-300 px-4 py-2 font-medium"
            >
                Create Organization
            </button>
            <span className="mx-3 text-red-400">{error}</span>
        </div>
    )
}