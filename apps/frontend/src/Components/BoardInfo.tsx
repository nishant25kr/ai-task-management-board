import { CreateBoard } from "./CreateBoard"
import type { Board, User } from "@/types";

export const BoardInfo = (
    { handleBoardCreated, changeBoard, boardId, boards, users }:
        {
            handleBoardCreated: (board: Board) => void,
            changeBoard: (id: string) => void,
            boardId: string,
            boards: Board[],
            users: User[]
        }
) => {
    const currentBoard = boards.find((board) => board.id === boardId);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
                    <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900">
                        {currentBoard?.title || "Board"}
                    </h1>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <CreateBoard onBoardCreated={handleBoardCreated} />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors focus-within:border-slate-400 focus-within:bg-white">
                        <label htmlFor="board" className="sr-only">Choose a board</label>
                        <select
                            id="board"
                            name="board"
                            onChange={(e) => changeBoard(e.target.value)}
                            value={boardId}
                            className="w-full cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none sm:w-auto"
                        >
                            {boards.map((item) => (
                                <option key={item.id} value={item.id}>{item.title}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Board members</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {users.length} {users.length === 1 ? "member" : "members"}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {users.map((member) => (
                            <span
                                key={member.id}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                            >
                                {member.username}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>

    )
}