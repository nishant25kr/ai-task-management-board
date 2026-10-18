import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BoardInfo } from "./BoardInfo";
import { ConnectRepository } from "./ConnectRepository";
import { Navbar } from "./Navbar";
import { SectionInfo } from "./SectionsInfo";
import { useBoardSocket } from "../Hooks/useBoardSocket";

export const Issue = () => {
    const { organizationId } = useParams();
    const navigate = useNavigate();
    const board = useBoardSocket(organizationId);

    useEffect(() => {
        if (!localStorage.getItem("token") || !organizationId) {
            navigate("/auth/login");
        }
    }, [navigate, organizationId]);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
                <BoardInfo
                    handleBoardCreated={board.boardCreated}
                    changeBoard={board.changeBoard}
                    boardId={board.boardId}
                    boards={board.boards}
                    users={board.users}
                />

                {board.error && (
                    <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <p>{board.error}</p>
                        <button
                            type="button"
                            className="font-medium underline"
                            onClick={board.clearError}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {board.loading ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                        Loading board...
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        {board.boardId && (
                            <ConnectRepository boardId={board.boardId} repo={board.repository} />
                        )}

                        {board.changingBoard ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                                Changing board...
                            </div>
                        ) : (
                            <SectionInfo
                                sections={board.sections}
                                tasks={board.tasks}
                                deletingSections={board.deletingSections}
                                sectionDeleteErrors={board.sectionDeleteErrors}
                                sectionCreateResult={board.sectionCreateResult}
                                sectionCreateError={board.sectionCreateError}
                                onDeleteSection={board.deleteSection}
                                onDeleteTask={board.deleteTask}
                                onMoveBackward={(taskId) => board.moveTask(taskId, -1)}
                                onMoveForward={(taskId) => board.moveTask(taskId, 1)}
                                onAddTask={board.addTask}
                                onAddSection={board.addSection}
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
