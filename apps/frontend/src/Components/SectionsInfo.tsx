import type { Section, Task } from "@/types";
import { AgentRunButton } from "./AgentRunButton";
import { useState } from "react";

export const SectionInfo = (
    {sections, deleteSectionLoading,deleteSection,deleteIssue,task,moveBackward,moveForward,addtask}:
    {
        sections: Section[],
        deleteSectionLoading : boolean,
        deleteSection : (id: string) => void,
        task : Task[],
        moveBackward:(id: string) => void,
        moveForward:(id: string) => void,
        deleteIssue : (id: string) => void,
        addtask: (id: string, newtask : string,description : string) => void
    }
) => {

    function handleAddTask(id: string){
        if( !newtask || !description ) return;
        addtask(id,newtask,description)
    }

    const [newtask,setNewtask] = useState<string | null>(null);
    const [description,setDescription] = useState<string | null>(null);

    return (
        <div>{sections.map((section) => (
            <div
                key={section.id}
                className="w-[310px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
            >
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{section.title}</h3>
                    {deleteSectionLoading ?
                        (
                            <div>Deleting</div>
                        ) : (
                            <button
                                type="button"
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600"
                                onClick={() => deleteSection(section.id)}
                            >
                                Delete
                            </button>
                        )}

                </div>

                <div className="space-y-3">
                    {task
                        .filter((issue) => issue.sectionId === section.id)
                        .map((issue) => {
                            const sectionIndex = sections.findIndex((item) => item.id === section.id);

                            return (
                                <div key={issue.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <div className="flex justify-end px-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => deleteIssue(issue.id)}
                                            className="rounded border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-600"
                                        >
                                            X
                                        </button>
                                    </div>

                                    <div className="flex items-stretch gap-1 px-2 pb-2">
                                        <button
                                            type="button"
                                            className="w-8 rounded border border-slate-200 bg-slate-50 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                            onClick={() => moveBackward(issue.id)}
                                            disabled={sectionIndex <= 0}
                                            aria-label={`Move ${issue.title} to the previous section`}
                                            title="Move to previous section"
                                        >
                                            ←
                                        </button>

                                        <div className="min-w-0 flex-1 rounded-md bg-slate-50 p-2">
                                            <p className="break-words text-sm font-medium text-slate-700">{issue.title}</p>
                                            <div className="mt-2">
                                                <AgentRunButton issueId={issue.id} />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="w-8 rounded border border-slate-200 bg-slate-50 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                            onClick={() => moveForward(issue.id)}
                                            disabled={sectionIndex >= sections.length - 1}
                                            aria-label={`Move ${issue.title} to the next section`}
                                            title="Move to next section"
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                <div className="mt-4 space-y-2 rounded-lg border border-dashed border-slate-300 bg-white p-2">
                    <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-400"
                        onChange={(e) => setNewtask(e.target.value)}
                        placeholder="Add task"
                    />
                    <input
                        type="text"
                        className="w-full rounded border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-400"
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                    />
                    <button
                        type="button"
                        className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                        onClick={() => handleAddTask(section.id)}
                    >
                        Create task
                    </button>
                </div>
            </div>
        ))}
        </div>
    )
}