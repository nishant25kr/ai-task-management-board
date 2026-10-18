import type { Section, Task } from "@/types";
import { useEffect, useState } from "react";
import { SectionColumn } from "./SectionColumn";

type SectionRequestResult = {
    requestId: string;
    section: Section;
};

type SectionRequestError = {
    requestId: string;
    message: string;
};

type SectionInfoProps = {
    sections: Section[];
    tasks: Task[];
    deletingSections: Record<string, string>;
    sectionDeleteErrors: Record<string, string>;
    sectionCreateResult: SectionRequestResult | null;
    sectionCreateError: SectionRequestError | null;
    onDeleteSection: (sectionId: string, requestId: string) => boolean;
    onDeleteTask: (taskId: string) => void;
    onMoveBackward: (taskId: string) => void;
    onMoveForward: (taskId: string) => void;
    onAddTask: (sectionId: string, title: string, description: string) => boolean;
    onAddSection: (title: string, requestId: string) => boolean;
};

export const SectionInfo = ({
    sections,
    tasks,
    deletingSections,
    sectionDeleteErrors,
    sectionCreateResult,
    sectionCreateError,
    onDeleteSection,
    onDeleteTask,
    onMoveBackward,
    onMoveForward,
    onAddTask,
    onAddSection,
}: SectionInfoProps) => {
    const [sectionTitle, setSectionTitle] = useState("");
    const [pendingCreateRequestId, setPendingCreateRequestId] = useState<string | null>(null);
    const [createError, setCreateError] = useState("");

    useEffect(() => {
        if (!pendingCreateRequestId) return;

        if (sectionCreateResult?.requestId === pendingCreateRequestId) {
            setSectionTitle("");
            setPendingCreateRequestId(null);
            setCreateError("");
        } else if (sectionCreateError?.requestId === pendingCreateRequestId) {
            setPendingCreateRequestId(null);
            setCreateError(sectionCreateError.message);
        }
    }, [pendingCreateRequestId, sectionCreateResult, sectionCreateError]);

    function handleAddSection(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!sectionTitle.trim() || pendingCreateRequestId) return;

        const requestId = crypto.randomUUID();
        setCreateError("");
        if (onAddSection(sectionTitle, requestId)) {
            setPendingCreateRequestId(requestId);
        } else {
            setCreateError("The board connection is not ready. Try again.");
        }
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-2">
            {sections.map((section) => (
                <SectionColumn
                    key={section.id}
                    section={section}
                    sections={sections}
                    tasks={tasks}
                    isDeleting={Boolean(deletingSections[section.id])}
                    deleteError={sectionDeleteErrors[section.id]}
                    onDeleteSection={(sectionId) => {
                        if (deletingSections[sectionId]) return;
                        onDeleteSection(sectionId, crypto.randomUUID());
                    }}
                    onDeleteTask={onDeleteTask}
                    onMoveBackward={onMoveBackward}
                    onMoveForward={onMoveForward}
                    onAddTask={onAddTask}
                />
            ))}

            <form
                className="w-[310px] shrink-0 rounded-xl border border-dashed border-slate-300 bg-white p-3 shadow-sm"
                onSubmit={handleAddSection}
            >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Add section
                </h3>
                <input
                    type="text"
                    value={sectionTitle}
                    placeholder="Section name"
                    onChange={(event) => setSectionTitle(event.target.value)}
                    disabled={Boolean(pendingCreateRequestId)}
                    className="mb-3 w-full rounded border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-400"
                />
                {createError && <p role="alert" className="mb-3 text-sm text-red-700">{createError}</p>}
                <button
                    type="submit"
                    disabled={Boolean(pendingCreateRequestId) || !sectionTitle.trim()}
                    className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {pendingCreateRequestId ? "Adding..." : "Add Section"}
                </button>
            </form>
        </div>
    );
};
