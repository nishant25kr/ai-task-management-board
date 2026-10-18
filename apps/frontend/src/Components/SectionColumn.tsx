import type { Section, Task } from "@/types";
import { AgentRunButton } from "./AgentRunButton";
import { useState } from "react";

type SectionColumnProps = {
    section: Section;
    sections: Section[];
    tasks: Task[];
    isDeleting: boolean;
    deleteError?: string;
    onDeleteSection: (sectionId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onMoveBackward: (taskId: string) => void;
    onMoveForward: (taskId: string) => void;
    onAddTask: (sectionId: string, title: string, description: string) => boolean;
};

type TaskCardProps = {
    task: Task;
    sectionIndex: number;
    sectionCount: number;
    onDelete: (taskId: string) => void;
    onMoveBackward: (taskId: string) => void;
    onMoveForward: (taskId: string) => void;
};

const TaskCard = ({
    task,
    sectionIndex,
    sectionCount,
    onDelete,
    onMoveBackward,
    onMoveForward,
}: TaskCardProps) => (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-end px-2 pt-2">
            <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="rounded border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-600"
            >
                X
            </button>
        </div>

        <div className="flex items-stretch gap-1 px-2 pb-2">
            <button
                type="button"
                className="w-8 rounded border border-slate-200 bg-slate-50 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => onMoveBackward(task.id)}
                disabled={sectionIndex <= 0}
                aria-label={`Move ${task.title} to the previous section`}
                title="Move to previous section"
            >
                ←
            </button>

            <div className="min-w-0 flex-1 rounded-md bg-slate-50 p-2">
                <p className="break-words text-sm font-medium text-slate-700">{task.title}</p>
                <div className="mt-2">
                    <AgentRunButton issueId={task.id} />
                </div>
            </div>

            <button
                type="button"
                className="w-8 rounded border border-slate-200 bg-slate-50 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => onMoveForward(task.id)}
                disabled={sectionIndex >= sectionCount - 1}
                aria-label={`Move ${task.title} to the next section`}
                title="Move to next section"
            >
                →
            </button>
        </div>
    </div>
);

export const SectionColumn = ({
    section,
    sections,
    tasks,
    isDeleting,
    deleteError,
    onDeleteSection,
    onDeleteTask,
    onMoveBackward,
    onMoveForward,
    onAddTask,
}: SectionColumnProps) => {
    const [taskTitle, setTaskTitle] = useState("");
    const [description, setDescription] = useState("");
    const [taskError, setTaskError] = useState("");
    const sectionIndex = sections.findIndex((item) => item.id === section.id);

    function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!taskTitle.trim() || !description.trim()) {
            setTaskError("Enter a task title and description.");
            return;
        }
        if (!onAddTask(section.id, taskTitle, description)) {
            setTaskError("The board connection is not ready. Try again.");
            return;
        }
        setTaskError("");
        setTaskTitle("");
        setDescription("");
    }

    return (
        <section className="w-[310px] shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    {section.title}
                </h3>
                <button
                    type="button"
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 disabled:opacity-50"
                    onClick={() => onDeleteSection(section.id)}
                    disabled={isDeleting}
                >
                    {isDeleting ? "Deleting..." : "Delete"}
                </button>
            </div>

            {deleteError && <p role="alert" className="mb-3 text-sm text-red-700">{deleteError}</p>}

            <div className="space-y-3">
                {tasks
                    .filter((task) => task.sectionId === section.id)
                    .map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            sectionIndex={sectionIndex}
                            sectionCount={sections.length}
                            onDelete={onDeleteTask}
                            onMoveBackward={onMoveBackward}
                            onMoveForward={onMoveForward}
                        />
                    ))}
            </div>

            <form
                className="mt-4 space-y-2 rounded-lg border border-dashed border-slate-300 bg-white p-2"
                onSubmit={handleAddTask}
            >
                <input
                    type="text"
                    value={taskTitle}
                    className="w-full rounded border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-400"
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="Add task"
                />
                <input
                    type="text"
                    value={description}
                    className="w-full rounded border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-400"
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Description"
                />
                {taskError && <p role="alert" className="text-sm text-red-700">{taskError}</p>}
                <button
                    type="submit"
                    className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                    Create task
                </button>
            </form>
        </section>
    );
};
